import { useSelector } from "react-redux";
import { Box, Circle, HStack } from "@chakra-ui/react";
import { BsFillBasket2Fill } from "react-icons/bs";

export default function CartButton({ onOpen, onClose, isOpen }) {
  const amount = useSelector((state) =>
    state.cart.items.reduce((acc, item) => acc + item.amount, 0)
  );

  return (
    <>
      <Box onClick={isOpen ? onClose : onOpen} as="button" margin="1em">
        <HStack>
          <Box position="relative">
            <BsFillBasket2Fill size={22} />
            <Circle
              position="absolute"
              right="-7px"
              top="-7px"
              size="20px"
              bg="red"
              color="white"
              display={amount > 0 ? "block" : "none"}
            >
              {amount}
            </Circle>
          </Box>

          <Box display={["none", "none", "block", "block", "block"]}>
            Ostoskori
          </Box>
        </HStack>
      </Box>
    </>
  );
}
