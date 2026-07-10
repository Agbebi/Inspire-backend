const { School } = require('../../models')

const searchSchools = async (req, res) => {
    try {
        const query = (req.query.q || '').trim()

        if (!query) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No query provided'
            })
        }

        const schools = await School.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { subDomain: { $regex: query, $options: 'i' } }
            ]
        })
            .sort({ name: 1 })
            .limit(8)
            .select('name subDomain')

        return res.status(200).json({
            success: true,
            data: schools,
            message: 'Schools fetched successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })
    }
}

module.exports = { searchSchools }
