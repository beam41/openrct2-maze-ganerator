import {
  window,
  WindowTemplate,
  button,
  store,
  dropdown,
  twoway,
  label,
  horizontal,
} from 'openrct2-flexui'
import {
  getAllValidTile,
  getMazeTileConnectedToGate,
  validTileToMazeGenTile,
} from '@/src/core/generate'
import { generateMaze, prefillTileAfterGate, removeWallNextToGate } from '@/src/core/maze'
import { buildNewMaze, cleanOldMaze, convertToFullTile, restoreMaze } from '@/src/core/build'

export function mainUI(): WindowTemplate {
  const mazeList = store<Ride[]>([])
  const mazeNameList = store<string[]>([])
  const selectingIndex = twoway(store(0))
  const fetchMaze = () => {
    const rides = map.rides.filter((v) => v.object.name === 'Maze')
    mazeList.set(rides)
    mazeNameList.set(rides.map((r) => r.name))
  }

  const genMazeOnCLick = () => {
    // const t0 = performance.now()
    const ride = mazeList.get()[selectingIndex.twoway.get()]
    if (!ride) {
      ui.showError('Cannot Build', 'Maze not found.')
      return
    }
    const entrance = ride.stations[0].entrance
    if (!entrance) {
      ui.showError('Cannot Build', 'Entrance not found.')
      return
    }
    const exit = ride.stations[0].exit
    if (!exit) {
      ui.showError('Cannot Build', 'Exit not found.')
      return
    }
    const cleanedMazeTile = cleanOldMaze(ride.id)
    try {
      const [valid, minX, minY] = getAllValidTile(getMazeTileConnectedToGate(entrance), ride?.id)
      let mazeTile = validTileToMazeGenTile(valid)
      mazeTile = prefillTileAfterGate(mazeTile, minX, minY, [entrance, exit])
      mazeTile = generateMaze(mazeTile)
      let fullTile = convertToFullTile(mazeTile)
      fullTile = removeWallNextToGate(fullTile, minX, minY, [entrance, exit])
      const [testPass, errCost, errBuild, errBuildMsg] = buildNewMaze(
        ride.id,
        fullTile,
        minX,
        minY,
        entrance.z,
        cleanedMazeTile,
        true,
      )
      if (testPass) {
        buildNewMaze(ride.id, fullTile, minX, minY, entrance.z, cleanedMazeTile, false)
      } else {
        restoreMaze(ride.id, entrance.z, cleanedMazeTile)
        ui.showError(
          'Cannot Build',
          errCost ? 'Not Enough Money.' : errBuild ? errBuildMsg : 'Unknown Build Error',
        )
      }
    } catch (e) {
      console.error((e as Error).message, (e as Error).stack)
      restoreMaze(ride.id, entrance.z, cleanedMazeTile)
      ui.showError('Cannot Build', 'Unknown Error')
    } finally {
      // const t1 = performance.now()
      // console.log(`Maze Generator took ${t1 - t0} milliseconds.`)
    }
  }

  return window({
    title: 'Maze Generator',
    width: 300,
    height: 100,
    padding: 5,
    content: [
      horizontal({
        content: [
          label({
            text: 'Maze: ',
          }),
          dropdown({
            items: mazeNameList,
            selectedIndex: selectingIndex,
            width: 250,
          }),
        ],
      }),
      button({
        text: 'Generate',
        padding: { top: 5 },
        onClick: genMazeOnCLick,
      }),
    ],
    onOpen: fetchMaze,
  })
}
