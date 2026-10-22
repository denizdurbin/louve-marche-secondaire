import type { ScpiInfo } from '@louve/core';
import { Section } from './ui';

/** Plain-language introduction: what the site is for, how the market works, what the site does not do. */
export function HowItWorks({ scpi }: { scpi: ScpiInfo }) {
  return (
    <Section
      id="comment-ca-marche"
      title="Comment ça marche"
      intro={`Ce site vous aide à décider s'il est intéressant d'acheter des parts de ${scpi.name}, et à quel prix, puis prépare l'email à envoyer à la société de gestion.`}
    >
      <div className="grid how-grid">
        <div className="card">
          <h3 className="card-title">Le principe</h3>
          <p className="small">
            Une SCPI achète et loue des immeubles. En achetant des parts, vous touchez une partie des loyers, sous forme de
            dividendes. Ni les revenus ni le capital ne sont garantis.
          </p>
          <p className="small">
            Les parts de {scpi.name} ne s'achètent plus auprès de la SCPI : on les achète à d'autres investisseurs qui
            vendent les leurs.
          </p>
          <p className="small">
            Une fois par mois, {scpi.managementCompany} réunit tous les ordres d'achat et de vente et fixe un prix unique,
            celui qui permet d'échanger le plus de parts. C'est la « confrontation ». Un ordre n'est donc pas forcément
            exécuté.
          </p>
        </div>
        <div className="card">
          <h3 className="card-title">Ce que fait ce site</h3>
          <ol className="how-steps small">
            <li>
              <a href="#marche">Le marché</a> : les derniers prix, les volumes échangés et les ordres en attente.
            </li>
            <li>
              <a href="#rendement">Le rendement</a> : ce que rapporte une part par rapport à ce que vous payez vraiment,
              frais compris.
            </li>
            <li>
              <a href="#confrontation">La prochaine confrontation</a> : le prix probable, et si votre ordre serait servi.
            </li>
            <li>
              <a href="#achat">L'achat</a> : un email prêt à envoyer à la société de gestion.
            </li>
          </ol>
        </div>
        <div className="card">
          <h3 className="card-title">Ce qu'il ne fait pas</h3>
          <p className="small">
            Il n'envoie rien et ne passe aucun ordre. L'achat se fait ensuite avec le mandat officiel, envoyé par courrier
            à la société de gestion.
          </p>
          <p className="small">
            Ce n'est pas un conseil en investissement. Les chiffres sont calculés à partir des données publiques, et les
            prévisions restent des estimations.
          </p>
          <p className="small">
            Les données de marché viennent du{' '}
            <a href={scpi.sourceUrl} target="_blank" rel="noreferrer">
              site officiel
            </a>{' '}
            (mis à jour toutes les 30 minutes) ; le dividende et les frais, des bulletins et du mandat de la SCPI.
          </p>
        </div>
      </div>
    </Section>
  );
}
