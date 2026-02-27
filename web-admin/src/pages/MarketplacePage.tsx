import { useEffect, useState } from 'react';
import { productsApi } from '../api/products.api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import Badge from '../components/ui/Badge';
import { normalizePaginationResponse } from '../utils/pagination';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  status: string;
  isApproved?: boolean;
  imageUrl?: string;
  createdAt: string;
  seller?: { id: string; fullname: string };
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadProducts = () => {
    setLoading(true);
    const params: Record<string, unknown> = {
      page,
      limit: 10,
    };
    if (search) params.search = search;
    if (statusFilter !== 'ALL') params.status = statusFilter;

    productsApi
      .getAllAdmin(params)
      .then((res) => {
        const norm = normalizePaginationResponse(res.data);
        setProducts(norm.data as Product[]);
        setTotalPages(norm.totalPages);
        setTotal(norm.total);
      })
      .catch(() => {
        setProducts([]);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    loadProducts();
  };

  const handleToggleStatus = (p: Product) => {
    const newStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionLoading(p.id);
    productsApi
      .updateStatus(p.id, newStatus)
      .then(() => loadProducts())
      .catch(() => {})
      .finally(() => setActionLoading(null));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    productsApi
      .delete(deleteTarget.id)
      .then(() => {
        setDeleteTarget(null);
        loadProducts();
      })
      .catch(() => {})
      .finally(() => setActionLoading(null));
  };

  const statusVariant = (s: string) =>
    s === 'ACTIVE' ? 'success' : s === 'OUT_OF_STOCK' ? 'danger' : 'warning';

  const stats = {
    total,
    active: products.filter((p) => p.status === 'ACTIVE').length,
    outOfStock: products.filter((p) => p.status === 'OUT_OF_STOCK').length,
    inactive: products.filter((p) => p.status === 'INACTIVE').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total: {stats.total} | ACTIVE: {stats.active} | OUT_OF_STOCK:{' '}
            {stats.outOfStock} | INACTIVE: {stats.inactive}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg w-48"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="ALL">Tous</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Rechercher
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          title="Aucun produit"
          subtitle="Ajustez les filtres ou attendez des créations"
          icon="🛒"
        />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Produit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Vendeur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Prix
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Statut approbation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.seller?.fullname ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {Number(p.price).toLocaleString()} XOF
                    </td>
                    <td className="px-4 py-3">{p.stock}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.isApproved ? 'success' : 'warning'}>
                        {p.isApproved ? 'Approuvé' : 'En attente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!p.isApproved && (
                          <button
                            onClick={() => {
                              setActionLoading(p.id);
                              productsApi
                                .approve(p.id)
                                .then(() => loadProducts())
                                .catch(() => {})
                                .finally(() => setActionLoading(null));
                            }}
                            disabled={!!actionLoading}
                            className="px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-sm"
                            title="Approuver"
                          >
                            Approuver
                          </button>
                        )}
                        {p.isApproved && (
                          <button
                            onClick={() => {
                              setActionLoading(p.id);
                              productsApi
                                .reject(p.id)
                                .then(() => loadProducts())
                                .catch(() => {})
                                .finally(() => setActionLoading(null));
                            }}
                            disabled={!!actionLoading}
                            className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 text-sm"
                            title="Rejeter"
                          >
                            Rejeter
                          </button>
                        )}
                        <button
                          onClick={() => setDetailProduct(p)}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title="Voir"
                        >
                          👁
                        </button>
                        {p.status !== 'OUT_OF_STOCK' && (
                          <button
                            onClick={() => handleToggleStatus(p)}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded hover:bg-gray-100"
                            title="Toggle ACTIVE/INACTIVE"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          title="Supprimer"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Modal détail */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailProduct(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {detailProduct.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {detailProduct.description ?? '-'}
            </p>
            <p className="text-sm mb-2">
              <strong>Prix:</strong>{' '}
              {Number(detailProduct.price).toLocaleString()} XOF
            </p>
            <p className="text-sm mb-2">
              <strong>Stock:</strong> {detailProduct.stock}
            </p>
            <p className="text-sm mb-2">
              <strong>Statut:</strong>{' '}
              <Badge variant={statusVariant(detailProduct.status)}>
                {detailProduct.status}
              </Badge>
            </p>
            <p className="text-sm mb-2">
              <strong>Vendeur:</strong>{' '}
              {detailProduct.seller?.fullname ?? '-'}
            </p>
            <p className="text-sm mb-4">
              <strong>Créé le:</strong>{' '}
              {new Date(detailProduct.createdAt).toLocaleString('fr-FR')}
            </p>
            <button
              onClick={() => setDetailProduct(null)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer le produit"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
