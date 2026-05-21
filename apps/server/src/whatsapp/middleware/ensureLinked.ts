import { getLinkedUserId } from "../state/repo";

export async function getLinkedUser(whatsappId: string): Promise<string | null> {
  return getLinkedUserId(whatsappId);
}
