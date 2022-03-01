// import modules
import SEOreport from './SEOreport/index.mjs'

async function exec() {
    let projects = await SEOreport.getProjects()
    let inactiveProjects = ["KTqxfedTXmGHCuXA", "NhzfBbbxLTkuWG8N", "nCJxwpS2BRFUrCJN"]

    console.log(`Found ${projects.length} Optimizer projects.`)

    let activeProjects = projects.filter(e => !inactiveProjects.includes(e.hash))

    console.log(activeProjects)
}

exec()