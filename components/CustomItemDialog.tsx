import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  useToast,
} from '@chakra-ui/react';
import { useCart } from '@/contexts/CartContext';
import { FaCartArrowDown } from 'react-icons/fa';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomItemDialog({ isOpen, onClose }: Props) {
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState<number>(1);
  const { addToCart } = useCart();
  const toast = useToast();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: 'Anna kaman nimi', status: 'warning', duration: 3000 });
      return;
    }
    const id = `custom-${Date.now()}`;
    addToCart({ id, name: name.trim(), amount });
    toast({
      title: 'Lisätty koriin',
      description: name,
      status: 'success',
      duration: 2500,
    });
    setName('');
    setAmount(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Lisää oma kama varaukseen</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={3}>
            <FormLabel>Nimi</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kaman nimi"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Määrä</FormLabel>
            <NumberInput min={1} value={amount} onChange={(val) => setAmount(Number(val))}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose} variant="ghost">
            Peruuta
          </Button>
          <Button colorScheme="teal" onClick={handleSubmit}>
            Lisää
            <FaCartArrowDown />
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
