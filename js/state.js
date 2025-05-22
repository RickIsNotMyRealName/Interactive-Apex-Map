export const state = {};

export function initState() {
  state.propertyKeys      = ['model','editorclass','classname','environment','instance_name','script_name'];
  state.filters           = {};
  state.missingFilters    = {};
  state.mapDef            = null;
  state.mapImage          = null;
  state.worldBounds       = {};
  state.entData           = [];
  state.entityTypeConfig  = [];
  state.entityTypeFilters = [];
  state.iconCache         = {};
  state.tintedIconCache   = {};
  state.transform         = { scale:1, offsetX:0, offsetY:0 };
  state.needsRedraw       = false;
  state.zipSegments       = [];
  state.heightMin         = 0;
  state.heightMax         = 0;
  state.hideOutOfRange    = false;
  state.belowClr          = '#00ffff';
  state.aboveClr          = '#ff00ff';
}
