import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL!
        }
    }
} as any)

async function main() {
    const user = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: '123456', // Plain text as requested
        },
    })
    console.log({ user })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
