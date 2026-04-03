import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-purple-400 hover:underline">
        &larr; Voltar
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-gray-500">Atualizada em 01 de abril de 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Dados Coletados</h2>
          <p>
            Coletamos as seguintes categorias de dados pessoais: dados de identificacao (nome, e-mail, CPF),
            dados de acesso (endereco IP, user agent, sessoes), dados financeiros (transacoes, historico de
            pagamentos) e dados de conteudo (uploads, mensagens, interacoes).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Base Legal (LGPD)</h2>
          <p>
            O tratamento de dados pessoais e realizado com base no consentimento do titular (Art. 7, I),
            na execucao de contrato (Art. 7, V) e no cumprimento de obrigacao legal (Art. 7, II).
            Para criadores, a verificacao de identidade (KYC) e obrigatoria por exigencia regulatoria.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Finalidade do Tratamento</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Prestacao dos servicos da plataforma</li>
            <li>Processamento de pagamentos e saques</li>
            <li>Verificacao de idade e identidade (KYC)</li>
            <li>Moderacao de conteudo e seguranca</li>
            <li>Comunicacoes sobre a conta e servicos</li>
            <li>Melhoria da experiencia do usuario</li>
            <li>Cumprimento de obrigacoes legais</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Protecao de Dados Sensíveis</h2>
          <p>
            O CPF e armazenado com criptografia AES-256, separada das chaves JWT. Documentos de KYC
            sao armazenados em bucket S3 com acesso restrito. Senhas utilizam bcrypt com 12 rounds.
            Tokens JWT possuem expiracao configuravel (15min access, 7d refresh).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Compartilhamento de Dados</h2>
          <p>
            Seus dados podem ser compartilhados com: processadores de pagamento (Pagar.me, Stripe)
            para transacoes financeiras; provedores de verificacao de identidade para KYC;
            autoridades competentes quando exigido por lei (inclusive NCMEC para reporte de CSAM).
            Nao vendemos dados pessoais a terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Armazenamento e Retencao</h2>
          <p>
            Dados sao armazenados em servidores seguros com criptografia em transito (TLS) e em
            repouso. Dados pessoais sao retidos enquanto a conta estiver ativa. Apos exclusao da
            conta, dados sao eliminados em ate 30 dias, exceto quando a retencao for necessaria
            para cumprimento de obrigacao legal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Direitos do Titular (LGPD Art. 18)</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Confirmacao da existencia de tratamento</li>
            <li>Acesso aos dados pessoais</li>
            <li>Correcao de dados incompletos ou desatualizados</li>
            <li>Anonimizacao, bloqueio ou eliminacao de dados desnecessarios</li>
            <li>Portabilidade dos dados</li>
            <li>Eliminacao dos dados tratados com consentimento</li>
            <li>Revogacao do consentimento</li>
          </ul>
          <p className="mt-2">
            Para exercer seus direitos, acesse Configuracoes &gt; Privacidade ou
            envie e-mail para privacidade@inti.mate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">8. Exclusao de Dados</h2>
          <p>
            Voce pode solicitar a exclusao completa de seus dados a qualquer momento em
            Configuracoes &gt; Privacidade &gt; Excluir minha conta. O processo e irreversivel
            e sera concluido em ate 30 dias, conforme a LGPD.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">9. Cookies</h2>
          <p>
            Utilizamos cookies essenciais para autenticacao (has_session) e funcionamento da
            plataforma. Nao utilizamos cookies de rastreamento de terceiros. Detalhes completos
            estao disponiveis na pagina de configuracao de cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">10. Seguranca</h2>
          <p>
            Implementamos medidas tecnicas e organizacionais para proteger seus dados, incluindo:
            criptografia AES-256, hashing bcrypt, autenticacao em dois fatores (2FA/TOTP),
            rate limiting, CSP headers, e monitoramento continuo de seguranca.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">11. Encarregado de Dados (DPO)</h2>
          <p>
            O Encarregado de Dados pode ser contatado pelo e-mail: dpo@inti.mate
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">12. Alteracoes</h2>
          <p>
            Esta politica pode ser atualizada periodicamente. Notificaremos os usuarios sobre
            alteracoes significativas por e-mail ou notificacao na plataforma.
          </p>
        </section>
      </div>
    </div>
  );
}
