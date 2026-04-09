const mongoose = require('mongoose');

const LOCAL = 'mongodb://localhost:27017/urban_stitch_vastra';
const ATLAS = 'mongodb+srv://aditideshmukh2425_db_user:Aditi%407126@cluster0.n1jyptc.mongodb.net/urban_stitch_vastra?appName=Cluster0';

const collections = ['users', 'dealers', 'products', 'categories', 'orders', 'carts', 'wishlists', 'reviews', 'coupons', 'notifications', 'activitylogs'];

async function migrate() {
  const local = await mongoose.createConnection(LOCAL).asPromise();
  const atlas = await mongoose.createConnection(ATLAS).asPromise();
  console.log('Connected to both databases');

  for (const col of collections) {
    try {
      const docs = await local.collection(col).find({}).toArray();
      if (docs.length === 0) { console.log(`${col}: empty, skipping`); continue; }
      await atlas.collection(col).deleteMany({});
      await atlas.collection(col).insertMany(docs);
      console.log(`${col}: migrated ${docs.length} documents`);
    } catch (e) {
      console.log(`${col}: error - ${e.message}`);
    }
  }

  await local.close();
  await atlas.close();
  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
