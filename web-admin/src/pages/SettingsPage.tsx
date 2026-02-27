export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-picpec-dark mb-6">
        Paramètres
      </h1>
      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">Général</h2>
          <p className="text-gray-600">
            Configuration générale de la plateforme PICPEC.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Sécurité</h2>
          <p className="text-gray-600">
            Paramètres de sécurité et authentification.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Logs</h2>
          <p className="text-gray-600">
            Consultation des logs système.
          </p>
        </section>
      </div>
    </div>
  );
}
