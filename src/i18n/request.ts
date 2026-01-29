import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const messagesObj = {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json')
};

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    if (!locale || !routing.locales.includes(locale as any)) {
        locale = routing.defaultLocale;
    }

    return {
        locale,
        messages: (await messagesObj[locale as keyof typeof messagesObj]()).default
    };
});
