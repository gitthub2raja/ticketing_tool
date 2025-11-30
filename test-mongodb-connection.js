// Quick MongoDB connection test script
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_tool';

console.log('Testing MongoDB connection...');
console.log('URI:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Hide password

const options = {};

try {
  await mongoose.connect(mongoUri, options);
  console.log('✓ Connection successful!');
  console.log('Connected to:', mongoose.connection.host);
  console.log('Database:', mongoose.connection.name);
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('✗ Connection failed!');
  console.error('Error:', error.message);
  
  if (error.message.includes('Authentication failed')) {
    console.error('\nPossible issues:');
    console.error('1. Username or password is incorrect');
    console.error('2. User does not exist in MongoDB');
    console.error('3. User does not have access to the database');
    console.error('4. Authentication database (authSource) is incorrect');
    console.error('\nTo fix:');
    console.error('1. Connect to MongoDB without auth first: mongosh');
    console.error('2. Create the user:');
    console.error('   use admin');
    console.error('   db.createUser({');
    console.error('     user: "ticketing_db",');
    console.error('     pwd: "DBPassword@2k25",');
    console.error('     roles: [{ role: "readWrite", db: "ticketing_tool" }]');
    console.error('   })');
    console.error('\nOr use MongoDB without authentication:');
    console.error('   MONGODB_URI=mongodb://localhost:27017/ticketing_tool');
  } else if (error.message.includes('ECONNREFUSED')) {
    console.error('\nMongoDB is not running or not accessible');
    console.error('Start MongoDB: sudo systemctl start mongod');
  } else if (error.message.includes('getaddrinfo')) {
    console.error('\nDNS resolution failed - check hostname/IP');
  }
  
  process.exit(1);
}

