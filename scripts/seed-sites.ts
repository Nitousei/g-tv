import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const collectionSites = [
    {
        name: "茅台资源站",
        apiUrl: "https://mtzy.me/api.php/provide/vod",
    },
    {
        name: "极速资源站",
        apiUrl: "https://jszy333.com/api.php/provide/vod",
    },
    {
        name: "豆瓣资源站",
        apiUrl: "https://dbzy.tv/api.php/provide/vod",
    },
]

async function main() {
    console.log("Seeding collection sites...")

    for (const site of collectionSites) {
        const result = await prisma.collectionSite.upsert({
            where: { name: site.name },
            update: { apiUrl: site.apiUrl },
            create: site,
        })
        console.log(`  ✓ ${result.name}`)
    }

    console.log("Done!")
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
