/**
 * Scénario 1 — Cycle de vie complet d'une tontine
 * Lance avec : npx ts-node test/scenarios/scenario-1-full-lifecycle.ts
 */
import axios from 'axios';

const API = 'http://localhost:3000';
const MOCK_DELAY_MS = 3500;

let users: { id: string; name: string; email: string }[] = [];
let tontine: { id: string; invitationToken: string } | null = null;

async function run() {
  console.log('\n🧪 ════ SCÉNARIO 1 : Cycle de vie complet ════\n');

  // 1. Reset
  console.log('📌 Étape 1 : Réinitialisation...');
  await axios.post(`${API}/api/test/reset`);

  // 2. Créer utilisateurs
  console.log('📌 Étape 2 : Création des utilisateurs...');
  const { data: seedData } = await axios.post(`${API}/api/test/seed/users`);
  users = seedData.users;
  console.log(`   ✅ ${users.length} utilisateurs créés`);

  // 3. Authentifier le créateur
  console.log('📌 Étape 3 : Authentification...');
  const { data: loginData } = await axios.post(`${API}/api/auth/login`, {
    email: 'alice@test.com',
    password: 'Test1234!',
  });
  const token = loginData.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  // 4. Créer une tontine
  console.log('📌 Étape 4 : Création de la tontine...');
  const { data: tontineData } = await axios.post(
    `${API}/api/tontines`,
    {
      titre: 'Tontine Test Mensuelle',
      description: 'Scénario de test complet',
      montant: 10000,
      nombreMembres: 3,
      frequence: 'MENSUEL',
      tauxPenalite: 10,
      dateDebut: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    { headers }
  );
  tontine = tontineData;
  console.log(`   ✅ Tontine créée : ${tontine!.id}`);
  console.log(`   🔗 Token invitation : ${tontine!.invitationToken}`);

  // 5. Récupérer le lien d'invitation
  console.log('📌 Étape 5 : Récupération du lien invitation...');
  const { data: linkData } = await axios.get(
    `${API}/api/tontines/${tontine!.id}/invitation-link`,
    { headers }
  );
  console.log(`   🔗 Lien : ${linkData.link}`);

  // 6. Bob rejoint
  console.log('📌 Étape 6 : Bob rejoint la tontine...');
  const { data: bobLogin } = await axios.post(`${API}/api/auth/login`, {
    email: 'bob@test.com',
    password: 'Test1234!',
  });
  await axios.post(
    `${API}/api/tontines/join/${tontine!.invitationToken}`,
    {},
    { headers: { Authorization: `Bearer ${bobLogin.accessToken}` } }
  );
  console.log(`   ✅ Bob a rejoint`);

  // 7. Clara rejoint (déclenche le tirage au sort)
  console.log('📌 Étape 7 : Clara rejoint → tirage au sort automatique...');
  const { data: claraLogin } = await axios.post(`${API}/api/auth/login`, {
    email: 'clara@test.com',
    password: 'Test1234!',
  });
  await axios.post(
    `${API}/api/tontines/join/${tontine!.invitationToken}`,
    {},
    { headers: { Authorization: `Bearer ${claraLogin.accessToken}` } }
  );
  console.log(`   ✅ Clara a rejoint — Tirage au sort effectué`);

  await new Promise((r) => setTimeout(r, 1000));

  // 8. Vérifier l'état
  console.log('📌 Étape 8 : Vérification état de la tontine...');
  const { data: etat } = await axios.get(`${API}/api/test/tontine/${tontine!.id}`);
  console.log(`   📊 Statut : ${etat.status}`);
  console.log(`   🎲 Ordre du tirage :`);
  etat.members
    .sort((a: { tourOrder: number }, b: { tourOrder: number }) => a.tourOrder - b.tourOrder)
    .forEach((m: { tourOrder: number; user: { fullname: string } }) =>
      console.log(`      Tour ${m.tourOrder} → ${m.user.fullname}`)
    );

  // 9. Payer toutes les cotisations du cycle 1
  console.log('📌 Étape 9 : Paiement de toutes les cotisations (cycle 1)...');
  const cycle1 = etat.cycles[0];
  await axios.post(`${API}/api/test/pay-all/${cycle1.id}`);
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  console.log(`   ✅ Toutes les cotisations payées`);
  console.log(`   💸 Virement automatique déclenché vers le bénéficiaire`);

  // 10. Vérifier le wallet du bénéficiaire
  const beneficiaryMemberId = cycle1.beneficiaryId;
  const beneficiaryMember = etat.members.find(
    (m: { id: string }) => m.id === beneficiaryMemberId
  );
  const beneficiaryUserId = beneficiaryMember?.userId;
  if (beneficiaryUserId) {
    const { data: wallet } = await axios.get(
      `${API}/api/test/wallet/${beneficiaryUserId}`
    );
    console.log(
      `   💰 Solde bénéficiaire : ${wallet.solde.toLocaleString('fr-FR')} FCFA`
    );
  }

  console.log('\n🎉 ════ SCÉNARIO 1 TERMINÉ AVEC SUCCÈS ════\n');
}

run().catch(console.error);
