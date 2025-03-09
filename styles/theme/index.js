// theme/index.js
import { extendTheme } from "@chakra-ui/react";
import styles from "./styles";

const theme = extendTheme({
  styles,
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
});

export default theme;
