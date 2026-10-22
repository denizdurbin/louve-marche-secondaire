import { formatEur, formatInt, type ClientOrderOutcome } from '@louve/core';

export interface OutcomeMessage {
  tone: 'info' | 'warning';
  title: string;
  text: string;
}

const parts = (n: number) => `${formatInt(n)} part${n > 1 ? 's' : ''}`;

/**
 * Plain-language reading of a simulated order, shared by the confrontation section and the email flow.
 * States facts about the visible book; it does not recommend a price.
 */
export function describeOutcome(
  outcome: ClientOrderOutcome,
  order: { shares: number; limitNet: number },
  acceptPartial = true,
): OutcomeMessage {
  const { estimate, served, sharesAheadAtLimit } = outcome;
  const price = estimate.price;

  if (price === null) {
    return {
      tone: 'warning',
      title: 'Probablement non servi',
      text: "D'après le carnet visible, aucun échange n'est attendu à la prochaine confrontation, même avec votre ordre.",
    };
  }
  if (served === order.shares) {
    return {
      tone: 'info',
      title: 'Probablement servi en totalité',
      text: `D'après le carnet visible, vos ${parts(order.shares)} seraient achetées au prix d'exécution estimé de ${formatEur(price)}. C'est ce prix que vous paieriez, pas votre maximum.`,
    };
  }
  if (order.limitNet < price) {
    return {
      tone: 'warning',
      title: 'Probablement non servi',
      text: `Votre prix maximum (${formatEur(order.limitNet)}) est inférieur au prix d'exécution estimé (${formatEur(price)}) : les vendeurs restants demandent plus.`,
    };
  }

  const queue =
    sharesAheadAtLimit > 0 && order.limitNet === price
      ? `À ${formatEur(price)}, ${parts(sharesAheadAtLimit)} sont déjà demandées au même prix. À prix égal, les ordres sont servis dans leur ordre d'arrivée : le vôtre passerait après elles. Les ordres à un prix maximum plus élevé sont servis avant. `
      : '';
  const result =
    served === 0
      ? 'Votre ordre ne serait pas servi.'
      : queue
        ? `Vous obtiendriez ${formatInt(served)} parts sur ${formatInt(order.shares)}.`
        : `Au prix d'exécution estimé de ${formatEur(price)}, il n'y a pas assez de parts à vendre pour tous les acheteurs : vous obtiendriez ${formatInt(served)} parts sur ${formatInt(order.shares)}.`;
  const partial =
    served > 0 && !acceptPartial
      ? " Vous n'acceptez pas l'exécution partielle : l'ordre pourrait alors ne pas être exécuté du tout (cas que nous ne modélisons pas)."
      : '';
  return {
    tone: 'warning',
    title: served === 0 ? 'Probablement non servi' : 'Probablement servi en partie',
    text: queue + result + partial,
  };
}
