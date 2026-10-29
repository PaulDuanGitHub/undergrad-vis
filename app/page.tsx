import Landing from '@/components/landing/Landing';
import StorySummary from '@/components/StorySummary';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-serif">
      <main className="flex flex-1 w-full flex-col items-center">
        <Landing />
        <StorySummary />
      </main>
    </div>
  );
}
