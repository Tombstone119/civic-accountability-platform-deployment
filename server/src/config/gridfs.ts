import mongoose from 'mongoose';

let bucket: mongoose.mongo.GridFSBucket | null = null;

export function getGridFSBucket(): mongoose.mongo.GridFSBucket {
  if (!bucket) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not established');
    bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  }
  return bucket;
}
