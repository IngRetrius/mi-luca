import { library } from '@miluca/config/eslint';

// domain no depende de ningún otro paquete del repositorio.
export default library({ forbid: ['@miluca/*'] });
