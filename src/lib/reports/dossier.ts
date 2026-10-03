import { rbacApi } from "@/lib/network/rbac/axios.config";

export const FARM_DOSSIER_URL = (farmId: number) => `/api/v1/reports/farms/${farmId}/dossier`;

/** Downloads one farm's dossier PDF (Reports' Dossier button, Farm Monitoring's Export Farm Dossier). */
export async function downloadFarmDossier(farmId: number, farmUid: string): Promise<void> {
  const res = await rbacApi.get<Blob>(FARM_DOSSIER_URL(farmId), { params: { format: "pdf" }, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dossier-${farmUid}-${new Date().toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
