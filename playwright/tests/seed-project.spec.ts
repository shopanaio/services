import { test } from '@fixtures/base.extend';
import { seedProject } from '@data/seed-project';
import { updateSeedConfig } from '@data/seedConfig';
import path from 'path';

test.describe('Seed Project', () => {
  test('Initialize project with test data', async ({ api }) => {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           🚀 Setting Up Project with Test Data             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    console.log('📝 Step 1: Setting up user, project, API key and installing apps...');
    await api.session.setupClient();

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                     ✅ Project Created!                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('📋 Project Information:');
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log(`│ Project Name: ${api.session.project.name.padEnd(42)}         │`);
    console.log(`│ Project Slug: ${api.session.projectSlug.padEnd(42)}          │`);
    console.log('├──────────────────────────────────────────────────────────────┤');
    console.log(`│ 🔑 API Key:   ${api.session.apiKey.padEnd(42)}               │`);
    console.log('└──────────────────────────────────────────────────────────────┘');
    console.log('\n');

    console.log('💾 Saving configuration to seed-config.yml...');
    updateSeedConfig({
      tenant: {
        email: api.session.tenant.data.email,
        password: api.session.tenant.data.password,
      },
      project: {
        slug: api.session.projectSlug,
        apiKey: api.session.apiKey,
      },
    });
    console.log('\n');

    console.log('📦 Step 2: Seeding project with test data...');
    // Убедимся что мы в tenant scope для создания продуктов
    api.session.setTenantScope();

    // Seed boxing data first (without reviews and customers)
    const boxingDataDir = path.resolve(process.cwd(), 'data', 'seed-boxing');
    console.log('\n🎁 Seeding BOXING data...');
    await seedProject(api.admin, boxingDataDir, { seedReviews: false, seedCustomers: false });

    // Then seed main json data (with reviews and customers)
    const jsonDataDir = path.resolve(process.cwd(), 'data', 'seed-json');
    console.log('\n📦 Seeding MAIN (JSON) data...');
    await seedProject(api.admin, jsonDataDir, { seedReviews: true, seedCustomers: true });

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              🎉 Project Setup Completed! 🎉                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('💾 Project credentials (saved in seed-config.yml):');
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log(`│ Email:        ${api.session.tenant.data.email.padEnd(42)}    │`);
    console.log(`│ Project Slug: ${api.session.projectSlug.padEnd(42)}          │`);
    console.log(`│ API Key:      ${api.session.apiKey.padEnd(42)}               │`);
    console.log('└──────────────────────────────────────────────────────────────┘');
    console.log('\n');
  });
});
