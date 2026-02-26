import mongoose from 'mongoose';

type CachedMongoose = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __gcuobaMongooseCache: CachedMongoose | undefined;
}

const cached: CachedMongoose = global.__gcuobaMongooseCache ?? {
  conn: null,
  promise: null,
};

global.__gcuobaMongooseCache = cached;

export async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri =
    process.env.MONGODB_URI ||
    process.env.INTERNAL_MONGODB_URI ||
    '';
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
