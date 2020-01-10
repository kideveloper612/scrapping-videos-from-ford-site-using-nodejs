const axios = require('axios')
var fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

var sections = ['Dash & Interior', 'SYNC & Technology', 'Safety & Security', 'Under the Hood & Mechanics', 'Vehicle Care', 'Vehicle Exterior']
var sub_sections = {
    'Dash & Interior': ['Comfort', 'Interior Features', 'Interior Technology'],
    'SYNC & Technology': ['Convenience', 'Entertainment', 'Mobile & Apps', 'SYNC', 'Safety'],
    'Safety & Security': ['Safety Equipment', 'Safety Features', 'Security'],
    'Under the Hood & Mechanics': ['Battery', 'Engine', 'Fluids', 'Mechanical'],
    'Vehicle Care': ['Exterior Care', 'Interior Care', 'Vehicle Health'],
    'Vehicle Exterior': ['Equipment', 'Lighting', 'Mechanical', 'Wheels'],
};

function csv_write(lines, filename) {
    var dir = './output';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    return new Promise((resolve, reject) => {
        const csvWriter = createCsvWriter({
            path: './output/'.concat(filename),
            header: [
                { id: 'year', title: 'YEAR' },
                { id: 'make', title: 'MAKE' },
                { id: 'model', title: 'MODEL' },
                { id: 'section', title: 'SECTION' },
                { id: 'sub_section', title: 'SUB_SECTION' },
                { id: 'title', title: 'TITLE' },
                { id: 'description', title: 'DESCRIPTION' },
                { id: 'thumbnail_url', title: 'THUMBNAIL_URL' },
                { id: 'video_url', title: 'VIDEO_URL' },
            ]
        });
        var records = [];
        if (lines.length > 1) {
            for (let line of lines) {
                records.push({
                    year: line['year'], make: line['make'], model: line['model'], section: line['section'], sub_section: line['sub_section'],
                    title: line['title'], description: line['description'], thumbnail_url: line['thumbnail_url'], video_url: line['video_url']
                })
            }
        }
        records.push({
            year: lines.year, make: lines.make, model: lines.model, section: lines.section, sub_section: lines.sub_section,
            title: lines.title, description: lines.description, thumbnail_url: lines.thumbnail_url, video_url: lines.video_url
        });
        csvWriter.writeRecords(records)       // returns a promise
            .then((res) => {
                console.log("===========================================================================================", res);
                resolve(res);
            })
            .catch((err) => {
                console.log("--------------------------------------------------------------------------------------------", err);
                reject(err);
            })
    });
}

function request(sub_url) {
    return new Promise((resolve, reject) => {
        let path = 'https://owner.ford.com/support/ford/_jcr_content.cxht' + sub_url + '.json';
        console.log(path);
        axios.get(path)
            .then((res) => {
                resolve(res);
            })
            .catch((error) => {
                reject(error);
            })
    })
}

function section_data(section, subsection) {
    return new Promise(async (resolve, reject) => {
        let section_names = section.split(" ");
        let subsection_names = subsection.split(" ");
        let section_url = '';
        for (let section_name of section_names) {
            if (section_name == '&') {
                section_url = section_url + '-' + 'and'
            } else {
                section_url = section_url + '-' + section_name.toLowerCase();
            }
        }
        let subsection_url = '';
        for (subsection_name of subsection_names) {
            subsection_url = subsection_url + '-' + subsection_name.toLowerCase();
        }
        let sub_url = section_url + subsection_url;
        let res = await request(sub_url);
        console.log(res.status);
        if (res.status == 200) resolve(res.data);
        else reject(res);
    });
}

async function get_suburl(filename) {
    results = []
    for (let i = 0; i < sections.length; i++) {
        let section = sections[i];
        let subsections = sub_sections[section];
        for (let index = 0; index < subsections.length; index++) {
            let subsection = subsections[index];
            await section_data(section, subsection)
                .then(async (res) => {
                    let data_array = res.results;
                    for (let data of data_array) {
                        var title = data.title;
                        var description = data.description;
                        var thumbnail_url = data.pageThumbnail;
                        var video_url = data.contentPath;
                        var tags = data.tags;
                        for (let tag of tags) {
                            make_model_year = tag.split("/");
                            if (make_model_year.length === 4) {
                                let year = make_model_year[1];
                                let make = make_model_year[2];
                                let model = make_model_year[3];
                                let line = {
                                    'year': year,
                                    'make': make,
                                    'model': model,
                                    'section': section,
                                    'subsection': subsection,
                                    'title': title,
                                    'description': description,
                                    'thumbnail_url': thumbnail_url,
                                    'video_url': video_url
                                }
                                console.log(line);
                                await csv_write(line, filename);

                                results.push(line);
                            }
                        }
                    }
                })
                .catch((err) => {
                    console.log("------------------------------", err);
                    process.exit();
                });
        }
    }
    // csv_write(results, "Ford_howto_videos_total.csv");
}

var filename = "Ford_howto_videos.csv";
get_suburl(filename = filename);
