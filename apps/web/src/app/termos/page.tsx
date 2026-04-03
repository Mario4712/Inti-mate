import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-purple-400 hover:underline">
        &larr; Voltar
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Termos de Uso</h1>
      <p className="mt-2 text-sm text-gray-500">Atualizado em 01 de abril de 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Aceitacao</h2>
          <p>
            Ao acessar ou utilizar a plataforma Inti.mate, voce concorda com estes Termos de Uso.
            Se voce nao concorda com algum destes termos, nao utilize nossos servicos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Elegibilidade</h2>
          <p>
            Voce deve ter no minimo 18 anos de idade para usar a plataforma. Ao se cadastrar,
            voce declara que e maior de idade e que possui capacidade legal para aceitar estes termos.
            A verificacao de idade e identidade (KYC) e obrigatoria para criadores de conteudo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Contas de Usuario</h2>
          <p>
            Voce e responsavel por manter a seguranca de sua conta e senha. A plataforma nao sera
            responsavel por perdas ou danos decorrentes do uso nao autorizado de sua conta.
            Cada usuario pode manter apenas uma conta na plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Conteudo</h2>
          <p>
            Criadores sao responsaveis por todo conteudo publicado. E proibido conteudo que envolva
            menores de idade, violencia real, discurso de odio, ou que viole a legislacao brasileira.
            Todo conteudo passa por moderacao automatica e humana antes de ser publicado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Pagamentos e Taxas</h2>
          <p>
            A plataforma retém 20% de todas as transações como taxa de serviço. Saques sao processados
            em D+14 via PIX. O valor minimo para saque e de R$ 20,00. Todas as transacoes sao
            realizadas em Reais (BRL).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Assinaturas e Cancelamentos</h2>
          <p>
            Assinaturas sao renovadas automaticamente. Voce pode cancelar a qualquer momento.
            O acesso ao conteudo continua ate o fim do periodo ja pago. Nao ha reembolso
            proporcional para cancelamentos antes do fim do periodo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Propriedade Intelectual</h2>
          <p>
            Criadores mantém todos os direitos sobre seu conteúdo. Ao publicar na plataforma,
            voce concede a Inti.mate uma licenca nao exclusiva para exibir, distribuir e
            processar o conteudo dentro da plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">8. Suspensao e Encerramento</h2>
          <p>
            A plataforma reserva-se o direito de suspender ou encerrar contas que violem estes
            termos, incluindo mas nao limitado a: publicacao de conteudo ilegal, fraude,
            assedio a outros usuarios, ou uso de multiplas contas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">9. Limitacao de Responsabilidade</h2>
          <p>
            A plataforma e fornecida &quot;como esta&quot;. Nao garantimos disponibilidade
            ininterrupta ou ausencia de erros. Em nenhum caso a Inti.mate sera responsavel
            por danos indiretos, incidentais ou consequenciais.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">10. Legislacao Aplicavel</h2>
          <p>
            Estes termos sao regidos pelas leis da República Federativa do Brasil. Quaisquer
            disputas serao resolvidas no foro da comarca de Sao Paulo, SP.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">11. Contato</h2>
          <p>
            Para duvidas sobre estes termos, entre em contato: legal@inti.mate
          </p>
        </section>
      </div>
    </div>
  );
}
