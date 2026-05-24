import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin user
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: 'admin@dongengdigital.id' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@dongengdigital.id',
      passwordHash,
      authMethod: 'email',
      role: 'admin',
    },
  });
  console.log('✓ Admin user seeded');

  // Free stories (with pages)
  const freeStories = [
    {
      title: 'Rubah dan Bulan',
      slug: 'rubah-dan-bulan',
      description: 'Seekor rubah kecil yang penasaran berteman dengan bulan di langit malam.',
      coverEmoji: '🦊',
      coverGradient: 'from-indigo-400 to-violet-500',
      durationMinutes: 5,
      isPremium: false,
      categories: ['hewan', 'penghantar_tidur'],
      pages: [
        { pageNumber: 1, text: 'Pada suatu malam berbintang, seekor rubah kecil mendongak menatap bulan perak di langit.', animationUrl: '/animations/starry-night.webm', audioUrl: '/audio/rubah-dan-bulan/p1.mp3', backgroundColor: 'bg-indigo-200' },
        { pageNumber: 2, text: '"Halo, Bulan!" seru si rubah. "Mengapa kamu bersinar begitu terang?"', animationUrl: '/animations/moon-glow.webm', audioUrl: '/audio/rubah-dan-bulan/p2.mp3', backgroundColor: 'bg-sky-200' },
        { pageNumber: 3, text: 'Bulan tersenyum dan berbisik, "Agar kamu bisa menemukan jalan pulang."', animationUrl: '/animations/forest-path.webm', audioUrl: '/audio/rubah-dan-bulan/p3.mp3', backgroundColor: 'bg-emerald-200' },
        { pageNumber: 4, text: 'Si rubah kecil meringkuk di bawah pohon dan perlahan-lahan terlelap tidur.', animationUrl: '/animations/sleeping-fox.webm', audioUrl: '/audio/rubah-dan-bulan/p4.mp3', backgroundColor: 'bg-amber-100' },
        { pageNumber: 5, text: 'Dan bulan menjaga hutan itu sepanjang malam hingga pagi pun tiba.', animationUrl: '/animations/sunrise.webm', audioUrl: '/audio/rubah-dan-bulan/p5.mp3', backgroundColor: 'bg-rose-200' },
      ],
    },
    {
      title: 'Paus yang Ingin Terbang',
      slug: 'paus-yang-ingin-terbang',
      description: 'Seekor paus yang lembut bermimpi menari bersama awan-awan di langit.',
      coverEmoji: '🐳',
      coverGradient: 'from-sky-400 to-cyan-500',
      durationMinutes: 4,
      isPremium: false,
      categories: ['hewan', 'petualangan'],
      pages: [
        { pageNumber: 1, text: 'Jauh di dalam laut biru, hiduplah seekor paus bernama Wally yang selalu bermimpi tentang langit.', animationUrl: '/animations/blue-sea.webm', audioUrl: '/audio/paus-yang-ingin-terbang/p1.mp3', backgroundColor: 'bg-sky-200' },
        { pageNumber: 2, text: 'Setiap pagi, Wally memandangi camar-camar yang menari-nari di atas ombak.', animationUrl: '/animations/seagulls.webm', audioUrl: '/audio/paus-yang-ingin-terbang/p2.mp3', backgroundColor: 'bg-cyan-100' },
        { pageNumber: 3, text: 'Suatu hari, seekor burung kecil berbisik, "Pejamkan matamu dan percayalah."', animationUrl: '/animations/tiny-bird.webm', audioUrl: '/audio/paus-yang-ingin-terbang/p3.mp3', backgroundColor: 'bg-amber-100' },
        { pageNumber: 4, text: 'Dan dalam mimpinya, Wally terbang menembus awan-awan yang berbentuk seperti ikan.', animationUrl: '/animations/cloud-fish.webm', audioUrl: '/audio/paus-yang-ingin-terbang/p4.mp3', backgroundColor: 'bg-indigo-200' },
      ],
    },
    {
      title: 'Biji Ek yang Pemberani',
      slug: 'biji-ek-yang-pemberani',
      description: 'Sebutir biji ek kecil menemukan arti sejati dari tumbuh dan berkembang.',
      coverEmoji: '🌰',
      coverGradient: 'from-amber-400 to-orange-500',
      durationMinutes: 4,
      isPremium: false,
      categories: ['alam', 'penghantar_tidur'],
      pages: [
        { pageNumber: 1, text: 'Di ujung dahan pohon ek tua yang tinggi, hiduplah sebutir biji ek kecil bernama Pip.', animationUrl: '/animations/oak-tree.webm', audioUrl: '/audio/biji-ek-yang-pemberani/p1.mp3', backgroundColor: 'bg-amber-200' },
        { pageNumber: 2, text: 'Pada suatu hari yang berangin, Pip terguling jatuh hingga ke tanah yang lembut di bawah.', animationUrl: '/animations/windy-fall.webm', audioUrl: '/audio/biji-ek-yang-pemberani/p2.mp3', backgroundColor: 'bg-orange-200' },
        { pageNumber: 3, text: '"Aku sangat kecil," bisik Pip. Namun tanah memeluknya dengan hangat.', animationUrl: '/animations/warm-soil.webm', audioUrl: '/audio/biji-ek-yang-pemberani/p3.mp3', backgroundColor: 'bg-yellow-200' },
        { pageNumber: 4, text: 'Banyak musim berlalu, dan Pip pun tumbuh menjadi pohon yang paling tinggi dari semuanya.', animationUrl: '/animations/tall-tree.webm', audioUrl: '/audio/biji-ek-yang-pemberani/p4.mp3', backgroundColor: 'bg-emerald-200' },
      ],
    },
  ];

  for (const story of freeStories) {
    const { pages, ...storyData } = story;
    const created = await prisma.story.upsert({
      where: { slug: storyData.slug },
      update: storyData,
      create: storyData,
    });
    for (const page of pages) {
      await prisma.storyPage.upsert({
        where: { storyId_pageNumber: { storyId: created.id, pageNumber: page.pageNumber } },
        update: page,
        create: { ...page, storyId: created.id },
      });
    }
  }
  console.log('✓ Free stories seeded (3 stories with pages)');

  // Premium stories (metadata only, no pages yet)
  const premiumStories = [
    { title: 'Balon Pelangi Lulu', slug: 'balon-pelangi-lulu', description: 'Lulu mengejar balon yang kabur melintasi seluruh kota yang penuh warna.', coverEmoji: '🎈', coverGradient: 'from-pink-400 to-rose-500', durationMinutes: 6, isPremium: true, categories: ['petualangan', 'persahabatan'] },
    { title: 'Naga Pembuat Kue', slug: 'naga-pembuat-kue', description: 'Seekor naga penyembur api menemukan bakat sejatinya di dapur yang hangat.', coverEmoji: '🐲', coverGradient: 'from-emerald-400 to-teal-500', durationMinutes: 5, isPremium: true, categories: ['hewan', 'persahabatan'] },
    { title: 'Putri dan Kunang-Kunang', slug: 'putri-dan-kunang-kunang', description: 'Seorang putri kecil yang takut gelap mendapat kunjungan dari ribuan bintang hidup.', coverEmoji: '👸', coverGradient: 'from-fuchsia-400 to-purple-500', durationMinutes: 7, isPremium: true, categories: ['penghantar_tidur', 'keluarga'] },
    { title: 'Petualangan Awan Kecil', slug: 'petualangan-awan-kecil', description: 'Sebuah awan kecil berkeliling dunia untuk menemukan tempat terbaik menurunkan hujan.', coverEmoji: '⛅', coverGradient: 'from-sky-300 to-blue-400', durationMinutes: 5, isPremium: true, categories: ['alam', 'petualangan'] },
    { title: 'Beruang dan Sungai Madu', slug: 'beruang-dan-sungai-madu', description: 'Seekor beruang kecil yang rakus belajar arti berbagi setelah menemukan sungai ajaib.', coverEmoji: '🐻', coverGradient: 'from-yellow-400 to-amber-500', durationMinutes: 6, isPremium: true, categories: ['hewan', 'persahabatan', 'cerita_rakyat'] },
  ];

  for (const story of premiumStories) {
    await prisma.story.upsert({
      where: { slug: story.slug },
      update: story,
      create: story,
    });
  }
  console.log('✓ Premium stories seeded (5 stories, metadata only)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
