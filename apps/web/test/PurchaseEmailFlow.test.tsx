import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { estimateConfrontation } from '@louve/core';
import type { MarketSnapshot, ScpiInfo } from '@louve/core';
import { PurchaseEmailFlow } from '../src/components/PurchaseEmailFlow';
import type { DraftOrder } from '../src/order';

const scpi: ScpiInfo = {
  id: 'primopierre',
  name: 'Primopierre',
  managementCompany: 'Praemia REIM France',
  managementCompanyEmail: 'serviceclients@praemiareim.com',
  sourceUrl: 'https://www.praemiareim.fr/fr/scpi-primopierre',
  fees: {
    cessionCommissionTtc: 0.048,
    registrationDuty: 0.05,
    fixedFeesEur: 90,
    source: 'mandat',
    sourceUrl: 'https://example.test/mandat.pdf',
  },
  dividends: [{ year: 2025, grossPerShare: 4.56, source: 'BTI' }],
};

const snapshot: MarketSnapshot = {
  scpiId: 'primopierre',
  scrapedAt: '2026-10-22T08:00:00Z',
  sourceUpdatedAt: null,
  lastExecutionPrice: 31.88,
  lastBuyerPrice: null,
  nextConfrontation: '2026-10-29T16:00',
  orderDeadline: '2026-10-27T16:00',
  realisationValue: null,
  distributionRate: null,
  capitalisation: null,
  history: [],
  orderBook: {
    bids: [
      { orderCount: 1, shares: 18, limitNet: 31.88, limitGross: 35 },
      { orderCount: 1, shares: 1000, limitNet: 27, limitGross: 29.65 },
      { orderCount: 2, shares: 1000, limitNet: 20, limitGross: 21.96 },
      { orderCount: 1, shares: 10, limitNet: 10, limitGross: 10.98 },
    ],
    asks: [
      { orderCount: 2, shares: 752, limitNet: 20 },
      { orderCount: 1, shares: 481, limitNet: 22 },
      { orderCount: 4, shares: 452, limitNet: 25 },
      { orderCount: 2, shares: 1539, limitNet: 28 },
      { orderCount: 3, shares: 1332, limitNet: 30 },
    ],
    visibleDepth: 5,
  },
};

const estimate = estimateConfrontation(snapshot.orderBook, 31.88);

/** Intl formats use narrow/non-breaking spaces; compare with plain ones. */
const plain = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ');

function renderFlow(order: DraftOrder = { shares: 100, netPrice: 32 }) {
  const onOrderChange = vi.fn();
  const user = userEvent.setup();
  render(<PurchaseEmailFlow scpi={scpi} snapshot={snapshot} estimate={estimate} order={order} onOrderChange={onOrderChange} />);
  return { user, onOrderChange };
}

type User = ReturnType<typeof userEvent.setup>;

async function fillStep1(user: User, opts: { associate?: 'Oui' | 'Non'; number?: string } = {}) {
  await user.type(screen.getByLabelText('Prénom'), 'Marie');
  await user.type(screen.getByLabelText('Nom'), 'Dupont');
  await user.click(screen.getByRole('radio', { name: opts.associate ?? 'Non' }));
  if (opts.number) await user.type(screen.getByLabelText("Numéro d'associé"), opts.number);
}

const goNext = (user: User) => user.click(screen.getByRole('button', { name: 'Continuer' }));
const stepTitle = () => screen.getByRole('heading', { name: /^Étape \d sur 3/ });
const sharesInput = () => screen.getByLabelText('Nombre de parts souhaité');
const priceInput = () => screen.getByLabelText(/Prix maximum par part, hors frais/);

async function reachStep2(user: User) {
  await fillStep1(user);
  await goNext(user);
}

async function reachPreview(user: User, opts?: Parameters<typeof fillStep1>[1]) {
  await fillStep1(user, opts);
  await goNext(user);
  await goNext(user);
}

describe('PurchaseEmailFlow step 1 (Vous)', () => {
  it('blocks Continuer with empty names and no associate answer', async () => {
    const { user } = renderFlow();
    await goNext(user);

    expect(stepTitle()).toHaveTextContent('Étape 1 sur 3');
    expect(screen.getByText('Le prénom est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Le nom est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Indiquez si vous êtes déjà associé(e).')).toBeInTheDocument();
    expect(screen.getByLabelText('Prénom')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nom')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: 'Oui' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: 'Non' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a required associate number after "Oui" and hides it after "Non"', async () => {
    const { user } = renderFlow();
    expect(screen.queryByLabelText("Numéro d'associé")).not.toBeInTheDocument();

    await fillStep1(user, { associate: 'Oui' });
    const number = screen.getByLabelText("Numéro d'associé");
    await goNext(user);

    expect(stepTitle()).toHaveTextContent('Étape 1 sur 3');
    expect(number).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText("Le numéro d'associé est obligatoire.")).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Non' }));
    expect(screen.queryByLabelText("Numéro d'associé")).not.toBeInTheDocument();
  });
});

describe('PurchaseEmailFlow happy path', () => {
  it('goes from the form to the email preview', async () => {
    const { user } = renderFlow();
    await reachStep2(user);

    expect(stepTitle()).toHaveTextContent('Étape 2 sur 3');
    expect(sharesInput()).toHaveValue('100');
    expect(priceInput()).toHaveValue('32');
    const summary = screen.getByText('Prix maximum frais inclus, par part').nextElementSibling;
    expect(plain(summary?.textContent ?? null)).toBe('35,14 €');

    await goNext(user);

    expect(stepTitle()).toHaveTextContent('Étape 3 sur 3');
    const headers = screen.getByText('À').closest('dl') as HTMLElement;
    expect(within(headers).getByText('serviceclients@praemiareim.com')).toBeInTheDocument();
    expect(plain(within(headers).getByText('Objet').nextElementSibling!.textContent)).toContain('Primopierre');

    const body = plain(screen.getByLabelText("Corps de l'email").textContent);
    expect(body).toContain('Marie DUPONT');
    expect(body).toContain('Pas encore associé');
    expect(body).toContain('Nombre de parts souhaité : 100');
    expect(body).toContain('32,00 €');
    expect(body).toContain('35,14 €');
  });

  it('puts the associate number in the email for an existing associate', async () => {
    const { user } = renderFlow();
    await reachPreview(user, { associate: 'Oui', number: 'A-12345' });

    expect(stepTitle()).toHaveTextContent('Étape 3 sur 3');
    expect(screen.getByLabelText("Corps de l'email").textContent).toContain('A-12345');
  });

  it('keeps the typed names when going back from step 2', async () => {
    const { user } = renderFlow();
    await reachStep2(user);
    await user.click(screen.getByRole('button', { name: 'Retour' }));

    expect(stepTitle()).toHaveTextContent('Étape 1 sur 3');
    expect(screen.getByLabelText('Prénom')).toHaveValue('Marie');
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');
    expect(screen.getByRole('radio', { name: 'Non' })).toBeChecked();
  });
});

describe('PurchaseEmailFlow step 2 (Votre ordre)', () => {
  it('blocks Continuer when the number of shares is empty', async () => {
    const { user } = renderFlow();
    await reachStep2(user);
    await user.clear(sharesInput());
    await goNext(user);

    expect(stepTitle()).toHaveTextContent('Étape 2 sur 3');
    expect(sharesInput()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Le nombre de parts doit être un entier/)).toBeInTheDocument();
  });

  it('rejects a price with 3 decimals but accepts a French decimal comma', async () => {
    const { user } = renderFlow();
    await reachStep2(user);

    await user.clear(priceInput());
    await user.type(priceInput(), '32,123');
    await goNext(user);
    expect(stepTitle()).toHaveTextContent('Étape 2 sur 3');
    expect(priceInput()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Le prix maximum ne peut pas avoir plus de 2 décimales.')).toBeInTheDocument();

    await user.clear(priceInput());
    await user.type(priceInput(), '32,10');
    await goNext(user);
    expect(stepTitle()).toHaveTextContent('Étape 3 sur 3');
    expect(plain(screen.getByLabelText("Corps de l'email").textContent)).toContain('32,10 €');
  });

  it('warns that a price of 20 would probably not be served', async () => {
    const { user } = renderFlow({ shares: 100, netPrice: 20 });
    await reachStep2(user);

    expect(screen.getByText(/non servi/i)).toBeInTheDocument();
  });

  it('says a price of 25 would be served in full', async () => {
    const { user } = renderFlow({ shares: 100, netPrice: 25 });
    await reachStep2(user);

    expect(screen.getByText(/servi en totalité/i)).toBeInTheDocument();
    expect(screen.queryByText(/non servi/i)).not.toBeInTheDocument();
  });

  it('reports typed order changes through onOrderChange', async () => {
    function Wrapper({ spy }: { spy: (o: DraftOrder) => void }) {
      const [order, setOrder] = useState<DraftOrder>({ shares: 100, netPrice: 32 });
      return (
        <PurchaseEmailFlow
          scpi={scpi}
          snapshot={snapshot}
          estimate={estimate}
          order={order}
          onOrderChange={(o) => {
            spy(o);
            setOrder(o);
          }}
        />
      );
    }
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper spy={spy} />);
    await reachStep2(user);

    await user.clear(priceInput());
    await user.type(priceInput(), '30,5');

    expect(spy).toHaveBeenLastCalledWith({ shares: 100, netPrice: 30.5 });
    expect(priceInput()).toHaveValue('30,5');

    await user.clear(sharesInput());
    await user.type(sharesInput(), '250');
    expect(spy).toHaveBeenLastCalledWith({ shares: 250, netPrice: 30.5 });
  });
});

describe('PurchaseEmailFlow step 3 (Votre email)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('offers a mailto link to the management company', async () => {
    const { user } = renderFlow();
    await reachPreview(user);

    const link = screen.getByRole('link', { name: 'Ouvrir dans ma messagerie' });
    expect(link.getAttribute('href')).toMatch(/^mailto:serviceclients@praemiareim\.com\?subject=/);
  });

  it('copies the email text to the clipboard and confirms', async () => {
    const { user } = renderFlow();
    // Stub after userEvent.setup(), which installs its own clipboard on navigator.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await reachPreview(user);

    await user.click(screen.getByRole('button', { name: 'Copier le texte' }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]![0]).toMatch(/^Objet :/);
    expect(await screen.findByText('Texte copié dans le presse-papiers.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copié ✓' })).toBeInTheDocument();
  });

  it('downloads the email as an .eml file', async () => {
    const { user } = renderFlow();
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(function () {}, { createObjectURL, revokeObjectURL }));
    // jsdom does not navigate on anchor clicks; just observe them.
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await reachPreview(user);

    await user.click(screen.getByRole('button', { name: 'Télécharger (.eml)' }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
  });
});
