import { NextResponse } from 'next/server';

// Mock 电视剧数据
const mockTvShows = [
    { id: 1, title: '流浪地球', year: 2019, rating: 8.0, poster: '/images/tv1.jpg', genre: '科幻' },
    { id: 2, title: '三体', year: 2023, rating: 8.7, poster: '/images/tv2.jpg', genre: '科幻' },
    { id: 3, title: '狂飙', year: 2023, rating: 8.5, poster: '/images/tv3.jpg', genre: '犯罪' },
    { id: 4, title: '繁花', year: 2024, rating: 8.2, poster: '/images/tv4.jpg', genre: '剧情' },
    { id: 5, title: '庆余年', year: 2019, rating: 8.0, poster: '/images/tv5.jpg', genre: '古装' },
    { id: 6, title: '漫长的季节', year: 2023, rating: 9.4, poster: '/images/tv6.jpg', genre: '悬疑' },
    { id: 7, title: '甄嬛传', year: 2011, rating: 9.3, poster: '/images/tv7.jpg', genre: '古装' },
    { id: 8, title: '人世间', year: 2022, rating: 8.4, poster: '/images/tv8.jpg', genre: '家庭' },
    { id: 9, title: '开端', year: 2022, rating: 8.2, poster: '/images/tv9.jpg', genre: '悬疑' },
    { id: 10, title: '沉默的真相', year: 2020, rating: 9.2, poster: '/images/tv10.jpg', genre: '悬疑' },
    { id: 11, title: '白夜追凶', year: 2017, rating: 8.9, poster: '/images/tv11.jpg', genre: '犯罪' },
    { id: 12, title: '隐秘的角落', year: 2020, rating: 8.9, poster: '/images/tv12.jpg', genre: '悬疑' },
    { id: 13, title: '琅琊榜', year: 2015, rating: 9.4, poster: '/images/tv13.jpg', genre: '古装' },
    { id: 14, title: '武林外传', year: 2006, rating: 9.6, poster: '/images/tv14.jpg', genre: '喜剧' },
    { id: 15, title: '仙剑奇侠传', year: 2005, rating: 9.1, poster: '/images/tv15.jpg', genre: '仙侠' },
    { id: 16, title: '父母爱情', year: 2014, rating: 9.5, poster: '/images/tv16.jpg', genre: '家庭' },
    { id: 17, title: '我的前半生', year: 2017, rating: 7.5, poster: '/images/tv17.jpg', genre: '都市' },
    { id: 18, title: '大江大河', year: 2018, rating: 8.8, poster: '/images/tv18.jpg', genre: '年代' },
    { id: 19, title: '知否知否', year: 2018, rating: 7.8, poster: '/images/tv19.jpg', genre: '古装' },
    { id: 20, title: '长安十二时辰', year: 2019, rating: 8.3, poster: '/images/tv20.jpg', genre: '古装' },
];

const PAGE_SIZE = 6;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Filter by query
    let filtered = mockTvShows;
    if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = mockTvShows.filter(
            show =>
                show.title.toLowerCase().includes(lowerQuery) ||
                show.genre.toLowerCase().includes(lowerQuery)
        );
    }

    // Paginate
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const items = filtered.slice(start, end);
    const hasMore = end < filtered.length;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return NextResponse.json({
        items,
        page,
        hasMore,
        total: filtered.length,
    });
}
