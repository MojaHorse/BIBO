import { redirect } from 'next/navigation';

export default function CheckersLegacyRedirect() {
  redirect('/play/checkers');
}
