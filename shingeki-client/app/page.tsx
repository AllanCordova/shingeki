import { redirect } from "next/navigation";

export default function Home() {
  // O proxy ja protege as rotas; aqui apenas direcionamos para a area logada.
  redirect("/projetos");
}
