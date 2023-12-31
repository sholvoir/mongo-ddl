import { JWT } from "sholvoir/jwt.ts";
import { Status } from "std/http/status.ts"
import { MongoClient, type IndexOptions } from "mongo";

const port = +(Deno.env.get('PORT') ?? 80);
const jwt = await new JWT().importKey(Deno.env.get('APP_KEY')!);

const host = Deno.env.get('MONGO_HOST');
const user = Deno.env.get('MONGO_USER');
const pass = Deno.env.get('MONGO_PASS');
const uri = `mongodb+srv://${user}:${pass}@${host}/?retryWrites=true&w=majority&authMechanism=SCRAM-SHA-1`;

interface IndexInfo {
    database: string;
    collection: string;
    indexes: IndexOptions[];
}

export async function handler(req: Request) {
    try {
        if (req.method != 'POST') return new Response('Only accept POST method', { status: Status.BadRequest });
        const token = req.headers.get('Authorization')?.match(/Bearer (.*)/)?.at(1);
        if (!token || !await jwt.verifyToken(token)) return new Response(undefined, { status: Status.Forbidden });
        const client = new MongoClient();
        await client.connect(uri);
        switch (new URL(req.url).pathname) {
            case "/create-index": {
                const body = await req.json() as IndexInfo;
                const collection = client.database(body.database).collection(body.collection);
                await collection.createIndexes({ indexes: body.indexes });
                client.close();
                return new Response(undefined, { status: Status.OK });
            }
            default: return new Response(undefined, { status: Status.BadRequest });
        }
        
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify(e), { status: Status.BadRequest });
    }
}

if (import.meta.main) Deno.serve({ port }, handler);
