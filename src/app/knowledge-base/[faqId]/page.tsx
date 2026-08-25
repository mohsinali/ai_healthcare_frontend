import { FaqDetail } from "@/components/faqs/faq-detail";
export default async function Page({ params }: { params: Promise<{ faqId: string }> }) { const { faqId } = await params; return <FaqDetail faqId={faqId} />; }
