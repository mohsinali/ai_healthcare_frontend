import { TelephonyDetail } from "@/components/telephony/telephony-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ telephonyNumberId: string }>;
}) {
  const { telephonyNumberId } = await params;
  return <TelephonyDetail telephonyNumberId={telephonyNumberId} />;
}
