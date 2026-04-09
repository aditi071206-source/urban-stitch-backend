const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Category = require('./models/Category');
const Product = require('./models/Product');
const Dealer = require('./models/Dealer');
const Coupon = require('./models/Coupon');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Category.deleteMany();
  await Product.deleteMany();
  await Dealer.deleteMany();
  await Coupon.deleteMany();

  // Create dealer
  const dealer = await Dealer.create({
    name: 'Admin Dealer',
    email: 'dealer@urbanstitch.com',
    password: 'dealer123',
    phone: '9999999999',
    storeName: 'Urban Stitch Vastra'
  });
  console.log('Dealer created: dealer@urbanstitch.com / dealer123');

  // Create categories
  const categories = await Category.insertMany([
    { name: "Men's Wear", slug: 'mens-wear', description: 'Trendy clothing for men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400' },
    { name: "Women's Kits", slug: 'womens-kits', description: 'Stylish outfits for women', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400' },
    { name: "Kids", slug: 'kids', description: 'Cute and comfortable kids wear', image: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=400' }
  ]);

  const [mens, womens, kids] = categories;

  // Create products
  await Product.insertMany([
    {
      name: 'Classic White Shirt',
      description: 'Premium cotton white formal shirt perfect for office and casual wear.',
      price: 899,
      originalPrice: 1499,
      discount: 40,
      category: mens._id,
      subCategory: 'Shirts',
      sizes: [{ size: 'S', stock: 10 }, { size: 'M', stock: 15 }, { size: 'L', stock: 8 }, { size: 'XL', stock: 5 }],
      images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500'],
      brand: 'Urban Stitch',
      tags: ['shirt', 'formal', 'white', 'cotton'],
      ratings: 4.5,
      numReviews: 24,
      isFeatured: true,
      dealer: dealer._id
    },
    {
      name: 'Slim Fit Jeans',
      description: 'Comfortable slim fit denim jeans with stretch fabric.',
      price: 1299,
      originalPrice: 2199,
      discount: 41,
      category: mens._id,
      subCategory: 'Jeans',
      sizes: [{ size: '30', stock: 12 }, { size: '32', stock: 18 }, { size: '34', stock: 10 }, { size: '36', stock: 6 }],
      images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=500'],
      brand: 'Urban Stitch',
      tags: ['jeans', 'denim', 'slim fit'],
      ratings: 4.3,
      numReviews: 18,
      isFeatured: true,
      dealer: dealer._id
    },
    {
      name: 'Casual Polo T-Shirt',
      description: 'Breathable polo t-shirt for everyday casual wear.',
      price: 599,
      originalPrice: 999,
      discount: 40,
      category: mens._id,
      subCategory: 'T-Shirts',
      sizes: [{ size: 'S', stock: 20 }, { size: 'M', stock: 25 }, { size: 'L', stock: 15 }],
      images: ['https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=500'],
      brand: 'Urban Stitch',
      tags: ['polo', 't-shirt', 'casual'],
      ratings: 4.1,
      numReviews: 32,
      isFeatured: false,
      dealer: dealer._id
    },
    {
      name: 'Floral Kurta Set',
      description: 'Beautiful floral printed kurta with palazzo pants. Perfect for festive occasions.',
      price: 1599,
      originalPrice: 2799,
      discount: 43,
      category: womens._id,
      subCategory: 'Kurtas',
      sizes: [{ size: 'XS', stock: 8 }, { size: 'S', stock: 12 }, { size: 'M', stock: 10 }, { size: 'L', stock: 6 }],
      images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500'],
      brand: 'Urban Stitch',
      tags: ['kurta', 'ethnic', 'floral', 'festive'],
      ratings: 4.7,
      numReviews: 45,
      isFeatured: true,
      dealer: dealer._id
    },
    {
      name: 'Elegant Saree',
      description: 'Silk blend saree with golden border. Ideal for weddings and celebrations.',
      price: 2499,
      originalPrice: 4999,
      discount: 50,
      category: womens._id,
      subCategory: 'Sarees',
      sizes: [{ size: 'Free Size', stock: 15 }],
      images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500'],
      brand: 'Urban Stitch',
      tags: ['saree', 'silk', 'wedding', 'ethnic'],
      ratings: 4.8,
      numReviews: 67,
      isFeatured: true,
      dealer: dealer._id
    },
    {
      name: 'Casual Maxi Dress',
      description: 'Flowy maxi dress perfect for summer outings and beach trips.',
      price: 1199,
      originalPrice: 1999,
      discount: 40,
      category: womens._id,
      subCategory: 'Dresses',
      sizes: [{ size: 'XS', stock: 10 }, { size: 'S', stock: 14 }, { size: 'M', stock: 12 }],
      images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500'],
      brand: 'Urban Stitch',
      tags: ['dress', 'maxi', 'summer', 'casual'],
      ratings: 4.4,
      numReviews: 29,
      isFeatured: false,
      dealer: dealer._id
    },
    {
      name: 'Kids Cartoon T-Shirt',
      description: 'Soft cotton t-shirt with fun cartoon prints for kids.',
      price: 399,
      originalPrice: 699,
      discount: 43,
      category: kids._id,
      subCategory: 'T-Shirts',
      sizes: [{ size: '2-3Y', stock: 20 }, { size: '4-5Y', stock: 18 }, { size: '6-7Y', stock: 15 }, { size: '8-9Y', stock: 10 }],
      images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=500'],
      brand: 'Urban Stitch',
      tags: ['kids', 't-shirt', 'cartoon', 'cotton'],
      ratings: 4.6,
      numReviews: 38,
      isFeatured: true,
      dealer: dealer._id
    },
    {
      name: 'Kids Denim Dungaree',
      description: 'Adorable denim dungaree set for toddlers and young kids.',
      price: 799,
      originalPrice: 1299,
      discount: 38,
      category: kids._id,
      subCategory: 'Dungarees',
      sizes: [{ size: '2-3Y', stock: 12 }, { size: '4-5Y', stock: 10 }, { size: '6-7Y', stock: 8 }],
      images: ['https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500'],
      brand: 'Urban Stitch',
      tags: ['kids', 'dungaree', 'denim'],
      ratings: 4.5,
      numReviews: 22,
      isFeatured: false,
      dealer: dealer._id
    },
    {
      name: 'Men\'s Blazer',
      description: 'Sharp formal blazer for business meetings and events.',
      price: 2999,
      originalPrice: 4999,
      discount: 40,
      category: mens._id,
      subCategory: 'Blazers',
      sizes: [{ size: 'S', stock: 5 }, { size: 'M', stock: 8 }, { size: 'L', stock: 6 }, { size: 'XL', stock: 4 }],
      images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500'],
      brand: 'Urban Stitch',
      tags: ['blazer', 'formal', 'business'],
      ratings: 4.6,
      numReviews: 15,
      isFeatured: true,
      dealer: dealer._id
    },
    {
      name: 'Women\'s Leggings',
      description: 'High-waist stretchable leggings for yoga and casual wear.',
      price: 499,
      originalPrice: 899,
      discount: 44,
      category: womens._id,
      subCategory: 'Leggings',
      sizes: [{ size: 'S', stock: 25 }, { size: 'M', stock: 30 }, { size: 'L', stock: 20 }, { size: 'XL', stock: 15 }],
      images: ['https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=500'],
      brand: 'Urban Stitch',
      tags: ['leggings', 'yoga', 'casual', 'stretchable'],
      ratings: 4.2,
      numReviews: 55,
      isFeatured: false,
      dealer: dealer._id
    }
  ]);

  // Create coupons
  await Coupon.insertMany([
    { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minOrderAmount: 500, maxUses: 1000 },
    { code: 'FLAT200', discountType: 'fixed', discountValue: 200, minOrderAmount: 1000, maxUses: 500 },
    { code: 'SAVE20', discountType: 'percentage', discountValue: 20, minOrderAmount: 2000, maxUses: 200 }
  ]);

  console.log('Seed data inserted successfully!');
  console.log('Coupons: WELCOME10, FLAT200, SAVE20');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
