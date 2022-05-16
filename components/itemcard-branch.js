import { Button, Box, Stack, Flex } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cart.slice';

const ItemCard = ({ Item }) => {
    const dispatch = useDispatch();

    const items = useSelector((state) => state.cart.items);
    const dates = useSelector((state) => state.dates);

    if (Item.reservations != undefined) {
        const effectiveReservations = Item.reservations.filter(
            (reservation) =>
                !(
                    reservation.loan.startTime > dates.endDate ||
                    reservation.loan.endTime < dates.startDate
                )
        );
        var reservedAmount = 0;
        effectiveReservations.map(
            (reservation) => (reservedAmount += reservation.amount)
        );
    }

    const availableAmount = Item.amount - reservedAmount;

    if (
        availableAmount -
            items
                .filter((item) => item.id === Item.id)
                .map((item) => item.amount) <=
        0
    ) {
        var buttonDisabled = true;
    } else {
        buttonDisabled = false;
    }

    if (availableAmount >= 1) {
        return (
            <Box
                borderWidth='4px'
                borderRadius='10px'
                backgroundColor='gray.400'
                width='200px'
                padding='8px'
            >
                <Box padding='4px'>
                    {' '}
                    <h2>{Item.name}</h2>{' '}
                </Box>
                <Flex direction='row' alignContent='center'>
                    <Button
                        isDisabled={buttonDisabled}
                        colorScheme='blue'
                        onClick={() => dispatch(addToCart(Item))}
                    >
                        Lisää koriin
                    </Button>
                    <Box
                        verticalAlign='center'
                        p='2'
                        borderRadius='full'
                        backgroundColor='blue.500'
                    >
                        {items
                            .filter((item) => item.id === Item.id)
                            .map((item) => item.amount)}
                    </Box>
                </Flex>
                <Box>Varattavissa: {availableAmount}</Box>
            </Box>
        );
    } else {
        return (
            <Box
                borderWidth='4px'
                borderRadius='10px'
                backgroundColor='gray.400'
                width='200px'
                padding='8px'
            >
                <Box padding='4px'>
                    {' '}
                    <h2>{Item.name}</h2>{' '}
                </Box>
                <Box>
                    Tätä tuotetta ei ole varattavissa valitsemallasi
                    ajanjaksolla
                </Box>
            </Box>
        );
    }
};

export default ItemCard;
