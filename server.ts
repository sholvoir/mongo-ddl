import { JWT } from "sholvoir/jwt.ts";
import { STATUS_CODE } from "std/http/status.ts"
import { MongoClient, type IndexOptions } from "mongo";

const port = +(Deno.env.get('PORT') ?? 80);
const jwt = await new JWT().importKey(Deno.env.get('APP_KEY')!);

const host = Deno.env.get('MONGO_HOST');
const user = Deno.env.get('MONGO_USER');
const pass = Deno.env.get('MONGO_PASS');
const uri = `mongodb+srv://${user}:${pass}@${host}/?retryWrites=true&w=majority&authMechanism=SCRAM-SHA-1`;

interface IMongo {
    database: string;
}
interface IIndexInfo extends IMongo {
    collection: string;
    indexes: IndexOptions[];
}
const headers = new Headers([
    ['Content-Type', 'application/json']
]);

export async function handler(req: Request) {
     if (req.method != 'POST') return new Response('Only accept POST method', { status: STATUS_CODE.BadRequest });
    const token = req.headers.get('Authorization')?.match(/Bearer (.*)/)?.at(1);
    if (!token || !await jwt.verifyToken(token)) return new Response(undefined, { status: STATUS_CODE.Forbidden });
    const client = new MongoClient();
    try {
        await client.connect(uri);
        switch (new URL(req.url).pathname) {
            case "/create-index": {
                const body = await req.json() as IIndexInfo;
                const collection = client.database(body.database).collection(body.collection);
                await collection.createIndexes({ indexes: body.indexes });
                return new Response(undefined, { status: STATUS_CODE.OK });
            }
            case "/get-collection-names": {
                const body = await req.json() as IMongo;
                const database = client.database(body.database);
                const result = await database.listCollectionNames();
                return new Response(JSON.stringify(result), { status: STATUS_CODE.OK, headers })
            }
            default: return new Response(undefined, { status: STATUS_CODE.BadRequest });
        }
        
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify(e), { status: STATUS_CODE.BadRequest });
    } finally {
        client.close();
    }
}

if (import.meta.main) Deno.serve({ port }, handler);
