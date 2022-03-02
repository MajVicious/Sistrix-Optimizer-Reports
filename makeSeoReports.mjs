// import modules
import SEOreport from './SEOreport/index.mjs'

// iterate over projects & generate data
async function exec(){
    let projects = await SEOreport.getProjects()
    let inactiveProjects = ["KTqxfedTXmGHCuXA", "NhzfBbbxLTkuWG8N", "nCJxwpS2BRFUrCJN", "JeqTHyFMCSqCf2La"]
    let activeProjects = projects.filter(e => !inactiveProjects.includes(e.hash))

    console.log(`Found ${projects.length} Optimizer projects.`)
    console.log(`Skipping ${inactiveProjects.length} inactive Optimizer projects.`)
    console.log(`Found ${activeProjects.length} active Optimizer projects.`)
    console.log('------------------------')

    for (let proj of activeProjects) {
        let report = new SEOreport(proj.hash)
        console.log(`Starting with ${proj.name}`)

        let visibility = await report.getVisibilityFromDates(10)
        console.log(`Visibility fetched for ${proj.name}`)

        let crawls = await report.getCrawls()
        console.log(`Crawls fetched for ${proj.name}`)

        let rankings = await report.getAllRankings()
        console.log(`Rankings fetched for ${proj.name}`)

        let overview = await report.getCrawlHistory()
        console.log(`Crawl history fetched for ${proj.name}`)
        
        console.log(`Building CSVs for ${proj.name}`)
        await SEOreport.makeCsv(visibility,`${proj.name}.visibility`)
        await SEOreport.makeCsv(crawls,`${proj.name}.crawls`)
        await SEOreport.makeCsv(rankings,`${proj.name}.rankings`)
        await SEOreport.makeCsv(overview,`${proj.name}.overview`)

        console.log(`Finished with ${proj.name}`)
        console.log('------------------------')
    }

    console.log('All reports successfully generated.')
}     

exec()                                                                                                                                                                                                                                                                                                                                                                              



