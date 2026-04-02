const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 Finance Backend running on http://localhost:${PORT}`);
  console.log(`\n📋 Seeded Users (for testing):`);
  console.log(`   admin@finance.dev    / admin123    [admin]`);
  console.log(`   analyst@finance.dev  / analyst123  [analyst]`);
  console.log(`   viewer@finance.dev   / viewer123   [viewer]`);
  console.log(`\n📖 API Docs: See README.md\n`);
});
