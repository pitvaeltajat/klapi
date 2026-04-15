import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { FaCartArrowDown } from 'react-icons/fa';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomItemDialog({ isOpen, onClose }: Props) {
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState<number>(1);
  const { addToCart } = useCart();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.warning('Anna kaman nimi');
      return;
    }
    const id = `custom-${Date.now()}`;
    addToCart({ id, name: name.trim(), amount });
    toast.success('Lisätty koriin', { description: name });
    setName('');
    setAmount(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lisää oma kama varaukseen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="custom-name">Nimi</Label>
            <Input
              id="custom-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kaman nimi"
            />
          </div>
          <div>
            <Label htmlFor="custom-amount">Määrä</Label>
            <Input
              id="custom-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Peruuta
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            Lisää
            <FaCartArrowDown />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
