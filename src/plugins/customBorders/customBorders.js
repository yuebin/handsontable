import BasePlugin from './../_base';
import {registerPlugin} from './../../plugins';
import {hasOwnProperty} from './../../helpers/object';
import {rangeEach} from './../../helpers/number';
import {CellRange, Selection} from './../../3rdparty/walkontable/src';
import bottom from './contextMenuItem/bottom';
import left from './contextMenuItem/left';
import noBorders from './contextMenuItem/noBorders';
import right from './contextMenuItem/right';
import top from './contextMenuItem/top';
import {createClassName, createDefaultCustomBorder, createSingleEmptyBorder, createEmptyBorders, extendDefaultBorder} from './utils';

/**
 * @plugin CustomBorders
 *
 * @description
 * This plugin enables an option to apply custom borders through the context menu (configurable with context menu key `borders`).
 *
 * To initialize Handsontable with predefined custom borders, provide cell coordinates and border styles in a form of an array.
 *
 * See [Custom Borders](http://docs.handsontable.com/demo-custom-borders.html) demo for more examples.
 *
 * @example
 * ```js
 * ...
 * customBorders: [
 *   {
 *    range: {
 *      from: {
 *        row: 1,
 *        col: 1
 *      },
 *      to: {
 *        row: 3,
 *        col: 4
 *      },
 *    },
 *    left: {},
 *    right: {},
 *    top: {},
 *    bottom: {},
 *   },
 * ],
 * ...
 *
 * // or
 * ...
 * customBorders: [
 *   { row: 2,
 *     col: 2,
 *     left: {
 *       width: 2,
 *       color: 'red',
 *     },
 *     right: {
 *       width: 1,
 *       color: 'green',
 *     },
 *     top: '',
 *     bottom: '',
 *   }.
 * ],
 * ...
 * ```
 * @private
 * @class CustomBorders
 */
class CustomBorders extends BasePlugin {
  constructor(hotInstance) {
    super(hotInstance);

    /**
     * Saved borders settings.
     *
     * @type {Array}
     */
    this.savedSettings = void 0;
  }

  /**
   * Check if the plugin is enabled in the handsontable settings.
   *
   * @returns {Boolean}
   */
  isEnabled() {
    return !!this.hot.getSettings().customBorders;
  }

  /**
   * Enable plugin for this Handsontable instance.
   */
  enablePlugin() {
    if (this.enabled) {
      return;
    }

    this.addHook('afterContextMenuDefaultOptions', (options) => this.addBordersOptionsToContextMenu(options));
    this.addHook('afterInit', () => this.onAfterInit());

    super.enablePlugin();
  }

  /**
   * Disable plugin for this Handsontable instance.
   */
  disablePlugin() {
    this.setsBordersSettings();

    super.disablePlugin();
  }

  /**
   * Updates the plugin to use the latest options you have specified.
   */
  updatePlugin() {
    this.disablePlugin();
    this.enablePlugin();

    this.setsBordersSettings();

    super.updatePlugin();
  }

  /**
   * Get index of border from the settings.
   *
   * @param {String} className Class name as string.
   * @returns {Number}
   */
  getSettingIndex(className) {
    rangeEach(0, this.hot.view.wt.selections.length - 1, (index) => {
      if (this.hot.view.wt.selections[index].settings.className === className) {
        return index;
      }
    });

    return -1;
  }

  /**
   * Insert WalkontableSelection instance into Walkontable settings.
   *
   * @param {Object} border Object with `row` and `col`, `left`, `right`, `top` and `bottom`, `className` and `border` ({Object} with `color`, `width` and `cornerVisible` property) properties.
   */
  insertBorderIntoSettings(border) {
    let coordinates = {
      row: border.row,
      col: border.col
    };
    let selection = new Selection(border, new CellRange(coordinates, coordinates, coordinates));
    let index = this.getSettingIndex(border.className);

    if (index >= 0) {
      this.hot.view.wt.selections[index] = selection;
    } else {
      this.hot.view.wt.selections.push(selection);
    }
  }

  /**
   * Prepare borders from setting (single cell).
   *
   * @param {Number} row Visual row index.
   * @param {Number} col Visual column index.
   * @param {Object} borderObj Object with `row` and `col`, `left`, `right`, `top` and `bottom` properties.
   */
  prepareBorderFromCustomAdded(row, col, borderObj) {
    let border = createEmptyBorders(row, col);

    border = extendDefaultBorder(border, borderObj);
    this.hot.setCellMeta(row, col, 'borders', border);

    this.insertBorderIntoSettings(border);
  }

  /** *
   * Prepare borders from setting (object).
   *
   * @param {Object} rowObj Object with `range`, `left`, `right`, `top` and `bottom` properties.
   */
  prepareBorderFromCustomAddedRange(rowObj) {
    let range = rowObj.range;

    rangeEach(range.from.row, range.to.row, (rowIndex) => {
      rangeEach(range.from.col, range.to.col, (colIndex) => {
        let border = createEmptyBorders(rowIndex, colIndex);
        let add = 0;

        if (rowIndex === range.from.row) {
          add++;

          if (hasOwnProperty(rowObj, 'top')) {
            border.top = rowObj.top;
          }
        }

        if (rowIndex === range.to.row) {
          add++;

          if (hasOwnProperty(rowObj, 'bottom')) {
            border.bottom = rowObj.bottom;
          }
        }

        if (colIndex === range.from.col) {
          add++;

          if (hasOwnProperty(rowObj, 'left')) {
            border.left = rowObj.left;
          }
        }

        if (colIndex === range.to.col) {
          add++;

          if (hasOwnProperty(rowObj, 'right')) {
            border.right = rowObj.right;
          }
        }

        if (add > 0) {
          this.hot.setCellMeta(rowIndex, colIndex, 'borders', border);
          this.insertBorderIntoSettings(border);
        }
      });
    });
  }

  /**
   * Remove borders divs from DOM.
   *
   * @param {String} borderClassName Border class name as string.
   */
  removeBordersFromDom(borderClassName) {
    let borders = this.hot.rootElement.querySelectorAll(`.${borderClassName}`);

    rangeEach(0, borders.length - 1, (index) => {
      if (borders[index]) {
        if (borders[index].nodeName !== 'TD') {
          let parent = borders[index].parentNode;

          if (parent.parentNode) {
            parent.parentNode.removeChild(parent);
          }
        }
      }
    });
  }

  /**
   * Remove border (triggered from context menu).
   *
   * @param {Number} row Visual row index.
   * @param {Number} col Visual column index.
   */
  removeAllBorders(row, col) {
    let borderClassName = createClassName(row, col);

    this.removeBordersFromDom(borderClassName);
    this.hot.removeCellMeta(row, col, 'borders');
  }

  /**
   * Set borders for each cell re. to border position.
   *
   * @param {Number} row Visual row index.
   * @param {Number} col Visual column index.
   * @param {String} place Coordinate where add/remove border - `top`, `bottom`, `left`, `right` and `noBorders`.
   * @param {Boolean} remove True when remove borders, and false when add borders.
   */
  setBorder(row, col, place, remove) {
    let bordersMeta = this.hot.getCellMeta(row, col).borders;

    if (!bordersMeta || bordersMeta.border === void 0) {
      bordersMeta = createEmptyBorders(row, col);
    }

    if (remove) {
      bordersMeta[place] = createSingleEmptyBorder();
    } else {
      bordersMeta[place] = createDefaultCustomBorder();
    }

    this.hot.setCellMeta(row, col, 'borders', bordersMeta);

    let borderClassName = createClassName(row, col);
    this.removeBordersFromDom(borderClassName);
    this.insertBorderIntoSettings(bordersMeta);

    this.hot.render();
  }

  /**
   * Prepare borders based on cell and border position.
   *
   * @param {Object} range CellRange object.
   * @param {String} place Coordinate where add/remove border - `top`, `bottom`, `left`, `right` and `noBorders`.
   * @param {Boolean} remove True when remove borders, and false when add borders.
   */
  prepareBorder(range, place, remove) {
    if (range.from.row === range.to.row && range.from.col === range.to.col) {
      if (place === 'noBorders') {
        this.removeAllBorders(range.from.row, range.from.col);
      } else {
        this.setBorder(range.from.row, range.from.col, place, remove);
      }

    } else {
      switch (place) {
        case 'noBorders':
          rangeEach(range.from.col, range.to.col, (colIndex) => {
            rangeEach(range.from.row, range.to.row, (rowIndex) => {
              this.removeAllBorders(rowIndex, colIndex);
            });
          });
          break;

        case 'top':
          rangeEach(range.from.col, range.to.col, (topCol) => {
            this.setBorder(range.from.row, topCol, place, remove);
          });
          break;

        case 'right':
          rangeEach(range.from.row, range.to.row, (rowRight) => {
            this.setBorder(rowRight, range.to.col, place);
          });
          break;

        case 'bottom':
          rangeEach(range.from.col, range.to.col, (bottomCol) => {
            this.setBorder(range.to.row, bottomCol, place);
          });
          break;

        case 'left':
          rangeEach(range.from.row, range.to.row, (rowLeft) => {
            this.setBorder(rowLeft, range.from.col, place);
          });
          break;

        default:
          break;
      }
    }
  }

  /**
   * Create borders from settings.
   *
   * @private
   * @param {Array} customBorders Object with `row` and `col`, `left`, `right`, `top` and `bottom` properties.
   */
  createCustomBorders(customBorders) {
    rangeEach(0, customBorders.length - 1, (index) => {
      if (customBorders[index].range) {
        this.prepareBorderFromCustomAddedRange(customBorders[index]);

      } else {
        this.prepareBorderFromCustomAdded(customBorders[index].row, customBorders[index].col, customBorders[index]);
      }
    });

    this.hot.render();
    this.hot.view.wt.draw(true);
  }

  /**
   * Add border options to context menu.
   *
   * @private
   * @param {Object} defaultOptions Context menu items.
   */
  addBordersOptionsToContextMenu(defaultOptions) {
    if (!this.hot.getSettings().customBorders) {
      return;
    }

    defaultOptions.items.push({
      name: '---------',
    });
    defaultOptions.items.push({
      key: 'borders',
      name: 'Borders',
      disabled() {
        return this.selection.selectedHeader.corner;
      },
      submenu: {
        items: [
          top(this),
          right(this),
          bottom(this),
          left(this),
          noBorders(this)
        ]
      }
    });
  }

  /**
   * Sets borders from settings.
   *
   * @private
   */
  setsBordersSettings() {
    let customBorders = this.hot.getSettings().customBorders;
    let bordersFromTable = this.hot.rootElement.querySelectorAll('td[class^="border"]');

    rangeEach(0, bordersFromTable.length - 1, (index) => {
      this.removeBordersFromDom(bordersFromTable[index].className);
    });

    if (customBorders) {
      if (Array.isArray(customBorders)) {
        this.savedSettings = customBorders;
        this.createCustomBorders(customBorders);

      } else if (customBorders !== void 0) {
        let borders = this.savedSettings ? this.savedSettings : customBorders;

        this.createCustomBorders(borders);
      }
    }
  }

  /**
   * `afterInit` hook callback.
   *
   * @private
   */
  onAfterInit() {
    this.setsBordersSettings();
  }

  /**
   * Destroy plugin instance.
   */
  destroy() {
    super.destroy();
  }
}

registerPlugin('customBorders', CustomBorders);

export default CustomBorders;
