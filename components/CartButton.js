import { useSelector } from 'react-redux';
import { Button } from '@chakra-ui/react';

export default function CartButton({ onOpen }) {
    const amount = useSelector((state) =>
        state.cart.items.reduce((acc, item) => acc + item.amount, 0)
    );

    return (
        <Button
            variant='transparent'
            size='sm'
            aria-label='cart'
            isDisabled={amount === 0}
            onClick={onOpen}
        >
            {amount}
        </Button>
    );
}
