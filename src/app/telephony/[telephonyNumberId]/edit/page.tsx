import { TelephonyEditor } from "@/components/telephony/telephony-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ telephonyNumberId: string }>;
}) {
  const { telephonyNumberId } = await params;
  return <TelephonyEditor telephonyNumberId={telephonyNumberId} />;
}
