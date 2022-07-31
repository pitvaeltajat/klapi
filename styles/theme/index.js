// theme/index.js
import { extendTheme } from '@chakra-ui/react';

// Global style overrides
import styles from './styles';

const theme = extendTheme({
    styles,
});

export default theme;
