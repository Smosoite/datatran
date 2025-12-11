// --- VISUAL GRID CALCULATION (Updated to support overflow expansion) ---
  const visualGrid = useMemo(() => {
    const shelvesDict: { [key: string]: LocationSlot[] } = {};
    locations.forEach(loc => {
      if (!shelvesDict[loc.shelf]) shelvesDict[loc.shelf] = [];
      shelvesDict[loc.shelf].push(loc);
    });

    const sortedShelfKeys = Object.keys(shelvesDict).sort(naturalSort);

    return sortedShelfKeys.map(shelfKey => {
        const slots = shelvesDict[shelfKey];
        
        const uniqueRows = [...new Set(slots.map(l => l.row))].sort(naturalSort);
        const uniqueCols = [...new Set(slots.map(l => l.column))].sort(naturalSort);
        
        // Calculate total visual rows required (handling spans that go beyond defined rows)
        let maxVisualRowIndex = uniqueRows.length - 1;
        
        const mappedSlots = slots.map(slot => {
            const rowIdx = uniqueRows.indexOf(slot.row);
            const colIdx = uniqueCols.indexOf(slot.column);
            
            // Check if this slot expands beyond the current shelf boundaries
            const endRowIdx = rowIdx + slot.height_span - 1;
            if (endRowIdx > maxVisualRowIndex) maxVisualRowIndex = endRowIdx;

            const top = (rowIdx * (BASE_HEIGHT + GAP_SIZE));
            const left = (colIdx * (UNIT_WIDTH + GAP_SIZE));

            return {
                ...slot,
                _top: top,
                _left: left,
                _zIndex: (slot.height_span > 1 || slot.width_span > 1) ? 100 : 1
            };
        });

        // Calculate height based on the MAX visual row reached, not just defined rows
        const visualRowCount = maxVisualRowIndex + 1;
        const totalHeight = (visualRowCount * BASE_HEIGHT) + ((visualRowCount - 1) * GAP_SIZE);

        return {
            shelfLabel: shelfKey,
            totalHeight: Math.max(totalHeight, BASE_HEIGHT),
            mappedSlots,
            rowCount: visualRowCount 
        };
    });
  }, [locations, BASE_HEIGHT, GAP_SIZE, UNIT_WIDTH]);

  // --- MERGE / RESIZE LOGIC (Updated to cross Shelf Boundaries) ---
  const handleResizeComplete = async (slotId: string, dimension: 'width' | 'height', direction: number) => {
    const slot = locations.find(l => l.id === slotId);
    if (!slot) return;

    // --- SHRINKING (No changes needed) ---
    if (direction < 0) {
        const newSpan = dimension === 'width' 
            ? Math.max(1, slot.width_span - 1)
            : Math.max(1, slot.height_span - 1);
        
        if (newSpan === (dimension === 'width' ? slot.width_span : slot.height_span)) return;

        setLocations(prev => prev.map(l => l.id === slotId ? { 
            ...l, 
            width_span: dimension === 'width' ? newSpan : l.width_span,
            height_span: dimension === 'height' ? newSpan : l.height_span
        } : l));
        
        await supabase.from('defined_locations').update(
            dimension === 'width' ? { width_span: newSpan } : { height_span: newSpan }
        ).eq('id', slotId);
        
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
    }

    // --- EXPANDING (Merge) ---
    const shelfSlots = locations.filter(l => l.shelf === slot.shelf);
    let victimId: string | null = null;

    if (dimension === 'width') {
        // ... Width logic stays the same (usually inside one shelf) ...
        const rowSlots = shelfSlots
            .filter(l => l.row === slot.row)
            .sort((a,b) => naturalSort(a.column, b.column));
            
        const myIndex = rowSlots.findIndex(l => l.id === slot.id);
        
        if (myIndex !== -1 && myIndex < rowSlots.length - 1) {
            const potentialVictim = rowSlots[myIndex + 1];
            if (potentialVictim) {
                 if (potentialVictim.items && potentialVictim.items.length > 0) {
                    Alert.alert(t('general.error'), "Cannot merge: Neighbor is occupied.");
                    return;
                }
                victimId = potentialVictim.id;
            }
        }
    } else {
        // --- HEIGHT MERGE (CROSS-SHELF FIX) ---
        
        // 1. First, look inside the CURRENT shelf
        const colSlots = shelfSlots
            .filter(l => l.column === slot.column)
            .sort((a,b) => naturalSort(a.row, b.row));
            
        const myIndex = colSlots.findIndex(l => l.id === slot.id);

        if (myIndex !== -1 && myIndex < colSlots.length - 1) {
            // Found a neighbor in the same shelf!
            const potentialVictim = colSlots[myIndex + 1];
            if (potentialVictim) {
                 if (potentialVictim.items && potentialVictim.items.length > 0) {
                    Alert.alert(t('general.error'), "Cannot merge: Neighbor is occupied.");
                    return;
                }
                victimId = potentialVictim.id;
            }
        } else {
            // 2. If NO neighbor in current shelf, check the NEXT SHELF below
            const allShelves = [...new Set(locations.map(l => l.shelf))].sort(naturalSort);
            const currentShelfIdx = allShelves.indexOf(slot.shelf);
            
            if (currentShelfIdx !== -1 && currentShelfIdx < allShelves.length - 1) {
                const nextShelfName = allShelves[currentShelfIdx + 1];
                
                // Find the visually matching column in the next shelf
                // We use Index matching to align (e.g. 1st column of Shelf A -> 1st column of Shelf B)
                const currentShelfCols = [...new Set(shelfSlots.map(l => l.column))].sort(naturalSort);
                const myColIdx = currentShelfCols.indexOf(slot.column);
                
                const nextShelfSlots = locations.filter(l => l.shelf === nextShelfName);
                const nextShelfCols = [...new Set(nextShelfSlots.map(l => l.column))].sort(naturalSort);
                
                if (myColIdx !== -1 && myColIdx < nextShelfCols.length) {
                    const targetCol = nextShelfCols[myColIdx];
                    // Get the TOP row of the next shelf
                    const nextShelfRows = [...new Set(nextShelfSlots.map(l => l.row))].sort(naturalSort);
                    const targetRow = nextShelfRows[0];
                    
                    const crossShelfVictim = nextShelfSlots.find(l => l.column === targetCol && l.row === targetRow);
                    
                    if (crossShelfVictim) {
                        if (crossShelfVictim.items && crossShelfVictim.items.length > 0) {
                            Alert.alert(t('general.error'), "Cannot merge: Neighbor (next shelf) is occupied.");
                            return;
                        }
                        victimId = crossShelfVictim.id;
                    }
                }
            }
        }
        
        // If still no victim found after checking current AND next shelf:
        if (!victimId) {
             Alert.alert(t('general.limit'), "Bottom of shelf reached.");
             return;
        }
    }

    if (victimId) {
        // --- EXECUTE MERGE ---
        const newLocs = locations.filter(l => l.id !== victimId).map(l => {
            if (l.id === slotId) {
                return {
                    ...l,
                    width_span: dimension === 'width' ? l.width_span + 1 : l.width_span,
                    height_span: dimension === 'height' ? l.height_span + 1 : l.height_span
                };
            }
            return l;
        });

        setLocations(newLocs);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Delete the victim (whether it was in this shelf or the next one)
        await supabase.from('defined_locations').delete().eq('id', victimId);
        
        // Expand the current slot
        await supabase.from('defined_locations').update(
            dimension === 'width' ? { width_span: slot.width_span + 1 } : { height_span: slot.height_span + 1 }
        ).eq('id', slotId);
    }
  };