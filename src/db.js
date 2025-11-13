import {MongoClient, ServerApiVersion} from "mongodb";

let _db;
let _client;

export async function connectDB(mongoURL, dbName) {
  console.log("In ConnectDB")
  if (_db) return _db;
  _client = new MongoClient(mongoURL, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });
  await _client.connect(); //Connect
  _db = _client.db(dbName); //User
  return _db;
}

export function getDB() {
  if (!_db) throw new Error("DB not initialized. Call connectDB() first.");
  return _db;
}

export async function closeDB() {
  if (_client) {
    await _client.close();
    _client = null;
    _db = null;
  }
}

    
