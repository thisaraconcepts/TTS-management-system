pipeline {
    agent any
    stages {
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        export VERSION=v20.11.0
                        export DISTRO=linux-x64
                        curl -fsSL https://nodejs.org/dist/$VERSION/node-$VERSION-$DISTRO.tar.gz -o node.tar.gz
                        tar -xzf node.tar.gz
                        export PATH=$PWD/node-$VERSION-$DISTRO/bin:$PATH
                        
                        npm install
                        chmod +x node_modules/.bin/*
                        npm run build
                    '''
                }
            }
        }
        stage('Deploy to Server') {
            steps {
                sh '''
                    APP_DIR="/home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk"
                    
                    echo "Deploying to production web root..."
                    mkdir -p frontend-dist
                    cp -r frontend/dist/* frontend-dist/
                    
                    # Automatically create public_html if it doesn't exist yet to prevent missing directory errors
                    mkdir -p $APP_DIR/public_html
                    
                    # Live CloudPanel public directory deployment
                    rm -rf $APP_DIR/public_html/*
                    cp -r frontend/dist/* $APP_DIR/public_html/
                    
                    echo "Deployment completed successfully!"
                '''
            }
        }
    }
}
