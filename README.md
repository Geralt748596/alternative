This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## генерация первого дня (1 января 2019):

curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"date": "2019-01-01"}'

## пакетная генерация диапазона (до 30 дней за раз):

curl -X POST http://localhost:3000/api/generate/batch \
  -H "Content-Type: application/json" \
  -d '{"from": "2019-01-01", "to": "2019-01-07"}'

## Если хочешь изменить контекст мира перед генерацией:

curl -X POST http://localhost:3000/api/context \
  -H "Content-Type: application/json" \
  -d '{"premise": "COVID-19 never happened", "details": "..."}'
