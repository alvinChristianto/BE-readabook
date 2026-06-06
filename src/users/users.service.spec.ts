import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // -------------------------------------------------------------------------
  // updateProfile
  // -------------------------------------------------------------------------

  describe('updateProfile', () => {
    it('updates the user name and returns snake_case auth_method', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'Rina',
        email: 'rina@example.com',
        role: 'user',
        authMethod: 'email',
      });

      const result = await service.updateProfile('u1', 'Rina');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'Rina' },
        select: { id: true, name: true, email: true, role: true, authMethod: true },
      });
      expect(result).toEqual({
        id: 'u1',
        name: 'Rina',
        email: 'rina@example.com',
        role: 'user',
        auth_method: 'email',
      });
    });
  });

  // -------------------------------------------------------------------------
  // updatePassword
  // -------------------------------------------------------------------------

  describe('updatePassword', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updatePassword('u1', 'old', 'newpass123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws BadRequestException for Google accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        authMethod: 'google',
        passwordHash: null,
      });
      await expect(service.updatePassword('u1', 'old', 'newpass123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when current password is wrong', async () => {
      const hash = await bcrypt.hash('correct-pass', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        authMethod: 'email',
        passwordHash: hash,
      });

      await expect(service.updatePassword('u1', 'wrong-pass', 'newpass123')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the password hash when current password is correct', async () => {
      const hash = await bcrypt.hash('correct-pass', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        authMethod: 'email',
        passwordHash: hash,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updatePassword('u1', 'correct-pass', 'newpass123');

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'u1' });
      // verify the new hash actually matches the new password
      const newHash = updateCall.data.passwordHash;
      expect(await bcrypt.compare('newpass123', newHash)).toBe(true);
      expect(result).toEqual({ ok: true });
    });
  });
});
