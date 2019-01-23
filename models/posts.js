const marked = require('marked')
const Post = require('../lib/mongo').Post
const CommentModel = require('./comments')

Post.plugin('addCommentsCount', {
  afterFind: function (posts) {
    return Promise.all(posts.map((post) => {
      return CommentModel.getCommentsCount(post._id).then((count) => {
        post.commentsCount = count
        return post
      })
    }))
  },
  afterFindOne: function (post) {
    if (post) {
      return CommentModel.getCommentsCount(post._id).then((count) => {
        post.commentsCount = count
        return post
      })
    }
    return post
  }
})

Post.plugin('contentToHtml', {
  afterFind: function (posts) {
    return posts.map((post) => {
      post.content = marked(post.content)
      return post
    })
  },
  afterFindOne: function (post) {
    if (post) {
      post.content = marked(post.content)
    }
    return post
  }
})

module.exports = {
  create: function (post) {
    return Post.insertOne(post).exec()
  },
  getPostById: function (postId) {
    return Post
      .findOne({ _id: postId })
      .populate({ path: 'author', model: 'User' })
      .addCreatedAt()
      .addCommentsCount()
      .contentToHtml()
      .exec()
  },
  getPosts: function (author) {
    const query = {}
    if (author) {
      query.author = author
    }
    return Post
      .find(query)
      .populate({ path: 'author', model: 'User' })
      .sort({ _id: -1 })
      .addCreatedAt()
      .addCommentsCount()
      .contentToHtml()
      .exec()
  },
  incPv: function (postId) {
    return Post
      .updateOne({ _id: postId }, { $inc: { pv: 1 } })
      .exec()
  },
  getRowPostById: function (postId) {
    return Post.findOne({ _id: postId }).exec()
  },
  updatePostById: function (postId, post) {
    return Post.update({ postId: postId }, { $set: post }).exec()
  },
  deletePostById: function (postId, author) {
    return Post.deleteOne({ author: author, _id: postId })
      .exec()
      .then((res) => {
        if (res.result.ok && res.result.n > 0) {
          return CommentModel.delCommentByPostId(postId)
        }
      })
  }
}