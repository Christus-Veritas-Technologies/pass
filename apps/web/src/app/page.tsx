import { redirect } from "next/dist/client/components/navigation";

export default function HomePage() {
  return redirect('/login');
}
