/* render/art.ts 鈥?鎵嬬粯鎶樼焊椋?SVG 璧勪骇鐨勭粺涓€鍏ュ彛銆? *
 * 鍏ㄩ儴缇庢湳閮芥斁鍦?assets/art/ 涓嬶紝杩愯鏃舵寜 id 鎷艰矾寰勶紙鍜屾棫 assets/ 鐨勭敤娉曚竴鑷达級锛? * 杩欐牱鏂板楠板瓙/楠版《/閬撳叿涓嶇敤鍐嶅洖鏉ユ敼杩欏紶琛ㄣ€俙-cut` 鐗堟湰鏄幓鎺夌焊搴曡壊鐨勫壀褰憋紝
 * 鐢ㄤ簬鐗屾銆佸晢搴楀崱杩欑被宸茬粡鏈夌焊寮犺儗鏅殑鍦版柟銆?*/
const ART = 'assets/art';
const PAPER = 'assets/paper';

export const dieArt = (id: string): string => `${ART}/dice/${id}-full-cut.svg`;
export const dieFacesArt = (id: string): string => `${ART}/dice/${id}-faces-cut.svg`;
export const barrelArt = (art: string): string => `${ART}/barrels/${art}-cut.svg`;
export const barrelCupArt = (art: string): string => `${ART}/barrels/${art}-cup.svg`;
export const itemArt = (id: string): string => `${ART}/items/${id}-cut.svg`;
export const tableArt = (art: string): string => `${ART}/tables/${art}.svg`;
/** White crumpled sheet with the tabletop drawn in coloured pencil. */
export const paperTableArt = (art: string): string => `${PAPER}/tables/${art}.svg?v=20261028-mat03`;
export const portraitArt = (art: string): string => `assets/portraits/paper/${art}.svg`;


