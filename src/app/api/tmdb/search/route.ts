import { NextResponse } from 'next/server';

const TMDB_API_KEY = 'f1d2643d56f81b79b53d7311ebbe9bb6';
const TMDB_READ_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmMWQyNjQzZDU2ZjgxYjc5YjUzZDczMTFlYmJlOWJiNiIsIm5iZiI6MTc2OTY2MDQyOS40MTI5OTk5LCJzdWIiOiI2OTdhZTAwZGUwN2RlYjNmNjgyMmI3MjgiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.TRQRz8xXKShjBPLBqy2cwcOYSfHWWB4fiqfM73dIxcg';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const type = searchParams.get('type') || 'multi'; // multi, movie, tv

    if (!query) {
        return NextResponse.json(
            { message: '缺少查询参数' },
            { status: 400 }
        );
    }

    try {
        const url = `${TMDB_BASE_URL}/search/${type}?query=${encodeURIComponent(query)}&language=zh-CN&page=1`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: `TMDB 接口错误: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // 提取第一个结果的海报
        const results = data.results || [];
        if (results.length > 0) {
            const first = results[0];
            const posterPath = first.poster_path;
            const backdropPath = first.backdrop_path;

            return NextResponse.json({
                found: true,
                poster: posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : null,
                backdrop: backdropPath ? `${TMDB_IMAGE_BASE}${backdropPath}` : null,
                title: first.title || first.name,
                overview: first.overview,
                vote_average: first.vote_average,
                release_date: first.release_date || first.first_air_date,
            });
        }

        return NextResponse.json({ found: false });
    } catch (error) {
        console.error('TMDB API error:', error);
        return NextResponse.json(
            { message: '获取 TMDB 数据失败' },
            { status: 500 }
        );
    }
}
