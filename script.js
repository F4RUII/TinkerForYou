let database = [];
let gridTemplateColumns = 0;
let materialPlacementTemplate = []; // Contain path in material directory in order
let traits = {};

const contentElements = [];

const table = document.getElementById("table");

async function operate() {
    await LoadData(); // Wait for data to finish loading in

    console.log(database);
    
    await AddHeaders(database.materials.moretcon['moretcon.atronium.json']);

    const materialFolder = database.materials;
    for (const materialSubfolderKey of Object.keys(materialFolder)) // Loop through subfolders
    {
        const materialSubfolder = materialFolder[materialSubfolderKey];
        for (const materialKey of Object.keys(materialSubfolder)) // Loop through materials
        {
            const material = materialSubfolder[materialKey];
            await AddMaterial(material);
        }
    }
}
operate();

///////////////////////
// MATERIAL FUNCTION //
///////////////////////

// Unpack materials' subfolders into materials
function unpackMaterial()
{
}

// Load data.json to 'database'
async function LoadData()
{
    const response = await fetch('./data.json');
    const data = await response.json();
    
    database = data;
    traits = database.traits;
};

// Add material elements
async function AddMaterial(material) {
    console.log(`Adding Material : ${material.localizedName}`)

    // Create and style content
    let content = document.createElement('div');
    content.id = 'content';
    content.style.gridTemplateColumns = `repeat(${gridTemplateColumns}, minmax(0, 1fr))`;
    const color = `#${material.color}`;
    content.style.backgroundColor = color;
    (LightOrDark(color) == 'dark') && (content.style.color = '#FFFFFF'); // Pretty fancy looking if-statement, eh?
    
    // Fill info into content
    for (const path of materialPlacementTemplate)
    {
        const pathArray = path.split('/');

        let {file, fileName} = GetFileFromPath(material, pathArray);

        let paragraph = document.createElement('p');
        paragraph = content.appendChild(paragraph);

        if (!file) { continue; } // Add blank and continue if file not found
        
        paragraph.textContent = file;
        if (fileName == 'color') // Add # before color hex
        {
            paragraph.textContent = `\#${file}`;
        }
        else if ( // Is traits
        pathArray.includes('traits') &&
        (fileName == 'localizedName' || fileName == 'internalName')
        )
        {
            pathArray.pop();
            const {file: trait, fileName: whatever} = GetFileFromPath(material, pathArray);
            paragraph.title = traits[`${trait.internalName}.json`].description;
        }
    }

    content = table.appendChild(content);
    contentElements.push(content);

    await delay(1);
}

// Add material headers elements
// NOTE TO SELF : Improve the readability of this sht
const addHeaderDelay = 5;
const addHeaderDebug = false;
async function AddHeaders(object)
{
    let gridTemplate = [] // Contain rows that contains letter representing stats

    async function GetGridData(
        object, // Material object, in case of loop, can be any object
        depth = 0, // The depth of the loop
        path = '' // The path leading to the value
        )
    {
        let columnCount = 0;
        let rowCount = 1;

        depth++;

        for (const key of Object.keys(object)) // Loop through values inside object
        {
            const child = object[key]

            let previousColumnCount = columnCount;               // Column of the previous folder
            let localDepth = 1;                                  // Depth of this subfolder
            let localPath = path == '' ? key : `${path}/${key}`; // Path to this content
            
            // -- Writing report -- //
            let padding = ''; // The padding and arrow to represent nested
            if (addHeaderDebug)
            {
                for (let space = 1; space < 5*(depth-1); space++) { padding += ' '; } // Space
                padding += '|';                                                       // Vertical line
                for (let space = 2; space < 5; space++) { padding += '-'; }           // Horizontal line
                padding += '\>';                                                      // Arrow head
                console.log(`${padding} ${key} | Depth = ${depth} | Column = ${columnCount}`); // Report before checking child
            }
            
            // -- Get grid template -- //
            const grid = {
                name: key,
                columnStart: columnCount,
                columnSpan: 1,
                rowSpan: 1,
                path: localPath,
            }

            if (gridTemplate.length < depth) { gridTemplate.push( [] ); } // Add new row if not enough
            const gridTemplateIndex = gridTemplate[depth - 1].length;
            gridTemplate[depth - 1][gridTemplateIndex] = grid;

            // -- Get column and row count -- //
            let columnType = ''; // Type of column (Inherit / Baseline)
            if (typeof child == 'object')
            {
                // Is a subfolder

                let childResult = await GetGridData(child, depth, localPath);
                
                columnCount += childResult.columnCount;
                columnType = 'Inherit'; // Inherited from child
                
                localDepth = childResult.rowCount; // Depth of the subfolder
            }
            else
            {
                // Is a file

                columnCount += 1;
                columnType = 'Baseline'; // Bottom of folder

                localDepth = depth; // Dept of this file

                // Mark to expand the row down
                gridTemplate[depth - 1][gridTemplateIndex].expandRow = true;
            }

            rowCount = Math.max(rowCount, localDepth);

            // -- Writing final result report of this folder -- //
            if (addHeaderDebug)
            {
                console.log(`${padding} @ ${key} | ${columnType} - Column = ${columnCount}`);
                console.log(`${padding} @ ${key} | ${columnType} - Row = ${rowCount}`);
                console.log(`${padding} @ ${key} | ${columnType} - Depth = ${localDepth}`);
            }

            // -- Grid template -- //
            const columnSpan = columnCount - previousColumnCount;
            gridTemplate[depth - 1][gridTemplateIndex].columnSpan = columnSpan;
            gridTemplate[depth - 1][gridTemplateIndex].rowSpan = localDepth;
            console.log(`Column Span = ${columnSpan}`);
            
            // Expand column
            for (let index = 1; index < columnSpan; index++)
            {
                gridTemplate[depth - 1].push(null);;
            } 

            console.log('') // Gap
        }

        return {columnCount, rowCount};
    }

    const result = await GetGridData(object);
    const columnCount = result.columnCount;
    const rowCount = result.rowCount;
    gridTemplateColumns = columnCount;
    
    // Report
    if (addHeaderDebug)
    {
        console.log(`Final result:\n Column = ${columnCount}\n Row = ${rowCount}`);
        console.log(`Grid Template:`);
        console.log(gridTemplate);
    }

    // Polishing grid template (Edit rowSpan to be accurate)
    let polishedGridTemplate = [];
    for (let rowIndex = 0; rowIndex < gridTemplate.length; rowIndex++) {
        const row = gridTemplate[rowIndex];
        
        for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {

            const grid = row[columnIndex];
            if (!polishedGridTemplate[rowIndex]) { polishedGridTemplate[rowIndex] = []; } // Add row if not already exist
            
            if (!grid) // Is a blank filler
            {
                FillObjectGap(polishedGridTemplate[rowIndex], null)

                continue;
            }

            console.log(grid);

            // Edit polished grid
            let polishedGrid = {...grid};
            console.log(`Row Count : ${rowCount}\nRow Span = ${grid.rowSpan}`)
            polishedGrid.rowSpan = rowCount - grid.rowSpan + 1;

            // Add polished grid
            let addedColumn = FillObjectGap(polishedGridTemplate[rowIndex], polishedGrid);
            const expandRow = Object.hasOwn(polishedGrid, 'expandRow');
            delete polishedGrid.expandRow;
            console.log(`Add ${polishedGrid.name} to ${rowIndex}, ${addedColumn}`);

            // Fill the rest of the column with 'null'
            if (expandRow)
            {
                console.log(`${polishedGrid.name} is expanding`)
                for (let expandRowIndex = rowIndex + 1; expandRowIndex < gridTemplate.length; expandRowIndex++) {
                    if (!polishedGridTemplate[expandRowIndex]) { polishedGridTemplate[expandRowIndex] = []; } // Add row if not already exist
                    polishedGridTemplate[expandRowIndex][addedColumn] = null;
                    console.log(`EXPAND Add null to ${expandRowIndex}, ${addedColumn}`);
                }

            }
            
        }
    }
    if (addHeaderDebug)
    {
        console.log(`Polished Grid Template:`);
        console.log(polishedGridTemplate);
        console.log(`Material Placement Template:`);
        console.log(materialPlacementTemplate);
    }

    // Add container to the table
    headers = document.createElement('div');
    headers.style.display = 'grid';
    headers.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;
    headers.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`;
    headers = table.appendChild(headers);

    // Add headers to container + Finish 'materialPlacementTemplate'
    for (let rowIndex = 0; rowIndex < polishedGridTemplate.length; rowIndex++) {
        const row = polishedGridTemplate[rowIndex];
        
        for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
            const grid = row[columnIndex];

            if (!grid) { continue; } // Skip blank filler
            
            await delay(addHeaderDelay);

            const name = grid.name;
            const columnSpan = grid.columnSpan;
            const rowSpan = grid.rowSpan;

            let gridElement = document.createElement('p');
            gridElement.textContent = name;
            console.log(gridElement.grid);
            gridElement.style.gridColumn = `${columnIndex+1} / span ${columnSpan}`;
            gridElement.style.gridRow = `${rowIndex+1} / span ${rowSpan}`;
            
            headers.appendChild(gridElement);

            materialPlacementTemplate[columnIndex] = grid.path;
        }
    }

    console.log(materialPlacementTemplate);
}


/////////////
// UTILITY //
/////////////

const delay = ms => new Promise(res => setTimeout(res, ms));

function GetFileFromPath(folder, pathArray)
{
    let file = folder;
    let fileName;
    pathArray.forEach(value => {
        if (!file) return;
        file = file[value];
        fileName = value;
        console.log(file, fileName);
    })
    console.log(file, fileName);
    
    return {file, fileName};
}

// Only 'undefined' count as hole in object
function FillObjectGap(object, item)
{
    let filledObject = object
    let filled = false;
    let index;
    for (index = 0; index < object.length; index++) {
        const checkingItem = object[index];
        if (checkingItem === undefined)
        {
            console.log(`Found hole!`);
            filledObject[index] = item;
            filled = true;
            break;
        }
    }
    if (!filled)
    {
        index = filledObject.length;
        filledObject.push(item);
    }

    return index;
}

// Got this from https://gist.github.com/krabs-github/ec56e4f1c12cddf86ae9c551aa9d9e04 , pretty cool
function LightOrDark(color) {
    let hsp, r, g, b;

    // Check the format of the color, HEX or RGB?
    if (color.match(/^rgb/)) {

        // If HEX --> store the red, green, blue values in separate variables
        color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

        r = color[1];
        g = color[2];
        b = color[3];
    } 
    else {

        // If RGB --> Convert it to HEX: http://gist.github.com/983661
        color = +("0x" + color.slice(1).replace( 
        color.length < 5 && /./g, '$&$&'
        )
                );

        r = color >> 16;
        g = color >> 8 & 255;
        b = color & 255;
    }

    // HSP equation from http://alienryderflex.com/hsp.html
    hsp = Math.sqrt(
        0.299 * (r * r) +
        0.587 * (g * g) +
        0.114 * (b * b)
    );

    // Using the HSP value, determine whether the color is light or dark
    if (hsp > 127.5) {

        return 'light';
    } 
    else {

        return 'dark';
    }
}